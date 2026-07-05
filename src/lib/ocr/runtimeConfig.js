export const DEFAULT_GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/** Web 端无 Key 时走的服务端代理基址（口令保护，见 api/gemini.js）。
 *  代理上游 = GEMINI_API_URL + /models/...，与直连的 apiUrl 同构，
 *  故 GEMINI_API_URL 可直接照抄 REACT_APP_GEMINI_API_URL（含 /v1beta）。 */
export const PROXY_API_BASE = '/api/gemini';

export const GENERATION_CONFIG = {
  temperature: 0,
  topP: 1,
  topK: 1,
  maxOutputTokens: 8192,
};

/**
 * 构建 Gemini API SSE 端点 URL
 * 支持两种输入：
 * 1. 基础 URL（如 https://...googleapis.com/v1beta）→ 自动拼接 model + streamGenerateContent
 * 2. 已含 :streamGenerateContent 的完整 URL → 仅补全 alt/key 参数
 */
export const buildGeminiEndpoint = (apiUrl, model, apiKey) => {
  const normalizedUrl = apiUrl.replace(/\/+$/, '');
  // 代理模式不带 key（Key 由服务端注入）；直连模式拼 key 参数
  const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';

  if (normalizedUrl.includes(':streamGenerateContent')) {
    const hasQuery = normalizedUrl.includes('?');
    const withAlt = /[?&]alt=/.test(normalizedUrl)
      ? normalizedUrl
      : `${normalizedUrl}${hasQuery ? '&' : '?'}alt=sse`;
    return /[?&]key=/.test(withAlt) ? withAlt : `${withAlt}${keyParam}`;
  }

  return `${normalizedUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse${keyParam}`;
};

/**
 * 创建运行时配置解析器，返回带 mode 的配置：
 * - 有 Key（页面或环境变量）→ { mode: 'direct', apiUrl, apiKey, model } 直连
 * - 无 Key + 桌面端 → 抛「缺少 API Key」（桌面端不走代理）
 * - 无 Key + Web 端 → { mode: 'proxy', apiUrl: 代理基址, accessToken, model }，缺口令则抛错
 * @param {{ envConfig: { apiUrl: string, apiKey: string, model: string }, isTauri?: boolean, proxyApiUrl?: string }} options
 */
export const createRuntimeConfigResolver = ({ envConfig, isTauri = false, proxyApiUrl = PROXY_API_BASE }) => {
  return ({ apiUrlConfig, apiKeyConfig, modelConfig, accessTokenConfig = '' }) => {
    const model = (modelConfig.trim() || envConfig.model).replace(/^models\//, '');
    const apiKey = apiKeyConfig.trim() || envConfig.apiKey;

    // 有 Key → 直连（页面配置优先，环境变量兜底）
    if (apiKey) {
      const apiUrl = apiUrlConfig.trim() || envConfig.apiUrl;
      return { mode: 'direct', apiUrl, apiKey, model };
    }

    // 无 Key + 桌面端 → 无法走代理，沿用缺 Key 引导
    if (isTauri) {
      throw new Error('缺少 Gemini API Key，请在设置中填入 API Key');
    }

    // 无 Key + Web 端 → 代理模式，需访问口令
    const accessToken = accessTokenConfig.trim();
    if (!accessToken) {
      throw new Error('缺少访问口令，请在设置中填入访问口令');
    }
    return { mode: 'proxy', apiUrl: proxyApiUrl, accessToken, model };
  };
};
