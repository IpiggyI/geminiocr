/**
 * Gemini 流式透明代理的纯逻辑（无 I/O，便于单测）。
 * 端点 handler 见 api/gemini/[...path].js。
 */

/** 代理默认上游 origin（GEMINI_API_URL 未配时回落；请求 path 自带 /v1beta） */
export const DEFAULT_GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';

const PROXY_PREFIX = '/api/gemini';

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
 * 由前端请求 URL 拼出上游 Gemini URL：剥掉 /api/gemini 前缀拼到上游 origin，
 * 并删除可能带入的 key 查询参数（Key 只走服务端注入的 x-goog-api-key 头）。
 * @param {{ requestUrl: string, upstreamBase: string }} input
 * @returns {string}
 */
export const buildUpstreamUrl = ({ requestUrl, upstreamBase }) => {
  const base = upstreamBase.replace(/\/+$/, '');
  const markerIndex = requestUrl.indexOf(PROXY_PREFIX);
  const suffix = markerIndex >= 0 ? requestUrl.slice(markerIndex + PROXY_PREFIX.length) : requestUrl;
  const url = new URL(`${base}${suffix}`);
  url.searchParams.delete('key');
  return url.toString();
};
