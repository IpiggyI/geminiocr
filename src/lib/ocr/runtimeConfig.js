export const DEFAULT_GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

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

  if (normalizedUrl.includes(':streamGenerateContent')) {
    const hasQuery = normalizedUrl.includes('?');
    const withAlt = /[?&]alt=/.test(normalizedUrl)
      ? normalizedUrl
      : `${normalizedUrl}${hasQuery ? '&' : '?'}alt=sse`;
    return /[?&]key=/.test(withAlt)
      ? withAlt
      : `${withAlt}&key=${encodeURIComponent(apiKey)}`;
  }

  return `${normalizedUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
};

/**
 * 创建运行时配置解析器
 * 页面配置优先于环境变量配置
 * @param {{ envConfig: { apiUrl: string, apiKey: string, model: string } }} options
 * @returns {(pageConfig: { apiUrlConfig: string, apiKeyConfig: string, modelConfig: string }) => { apiUrl: string, apiKey: string, model: string }}
 */
export const createRuntimeConfigResolver = ({ envConfig }) => {
  return ({ apiUrlConfig, apiKeyConfig, modelConfig }) => {
    const apiUrl = apiUrlConfig.trim() || envConfig.apiUrl;
    const apiKey = apiKeyConfig.trim() || envConfig.apiKey;
    const model = (modelConfig.trim() || envConfig.model).replace(/^models\//, '');

    if (!apiKey) {
      throw new Error('缺少 Gemini API Key，请在页面配置或环境变量 REACT_APP_GEMINI_API_KEY 中设置');
    }

    return { apiUrl, apiKey, model };
  };
};
