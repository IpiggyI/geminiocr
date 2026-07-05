import { evaluateProxyAccess, buildUpstreamUrl, DEFAULT_GEMINI_ORIGIN } from '../../src/lib/proxy/geminiProxy';

/**
 * Gemini 流式透明代理端点（Vercel Node 动态路由）。
 * 校验访问口令 → 注入服务端 Key（x-goog-api-key 头）→ 逐 chunk 透传上游 SSE 流。
 * 不做任何格式转换，前端 SSE 解析零改动。
 */
export default async function handler(req, res) {
  const denial = evaluateProxyAccess({
    method: req.method,
    accessToken: req.headers['x-access-token'],
    expectedToken: process.env.ACCESS_TOKEN,
  });
  if (denial) {
    return res.status(denial.status).json({ error: denial.message });
  }

  try {
    const upstreamUrl = buildUpstreamUrl({
      requestUrl: req.url,
      upstreamBase: process.env.GEMINI_API_URL || DEFAULT_GEMINI_ORIGIN,
    });

    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    if (!upstream.body) {
      res.end();
      return;
    }

    // 逐 chunk 透传上游流（SSE），非 2xx 时同样原样透传状态与 body
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error) {
    console.error('Gemini 代理转发失败:', error);
    res.status(502).json({ error: error.message });
  }
}
