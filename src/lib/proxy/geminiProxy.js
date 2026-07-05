/**
 * Gemini 流式透明代理的纯逻辑（无 I/O，便于单测）。
 * 端点 handler 见 api/gemini.js。
 */

/** 代理默认上游 origin（GEMINI_API_URL 未配时回落；__path 自带 /v1beta） */
export const DEFAULT_GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';

/**
 * 访问门校验：非 POST → 405；未配置口令 → 503；口令不匹配 → 401；通过 → null
 * @param {{ method: string, accessToken?: string, expectedToken?: string }} input
 * @returns {{ status: number, message: string } | null}
 */
export const evaluateProxyAccess = ({ method, accessToken, expectedToken }) => {
  if (method !== 'POST') {
    return { status: 405, message: 'Method not allowed' };
  }
  if (!expectedToken) {
    return { status: 503, message: 'Proxy not configured' };
  }
  if (accessToken !== expectedToken) {
    return { status: 401, message: 'Invalid access token' };
  }
  return null;
};

/**
 * 由 vercel rewrite 传入的 __path（Gemini 尾路径）+ 其余 query 拼出上游 URL。
 * 剔除 __path 与 key（Key 只走服务端注入的 x-goog-api-key 头，不入 query）。
 * @param {{ tailPath?: string, query?: Record<string, string|string[]>, upstreamBase: string }} input
 * @returns {string}
 */
export const buildUpstreamUrl = ({ tailPath, query = {}, upstreamBase }) => {
  const base = upstreamBase.replace(/\/+$/, '');
  const path = String(tailPath || '').replace(/^\/+/, '');
  const url = new URL(`${base}/${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (key === '__path' || key === 'key') continue;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
    } else if (value !== undefined) {
      url.searchParams.append(key, value);
    }
  }
  return url.toString();
};
