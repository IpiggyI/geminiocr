import { createRuntimeConfigResolver, buildGeminiEndpoint } from './runtimeConfig';

describe('createRuntimeConfigResolver', () => {
  test('prefers page config over env config (direct mode)', () => {
    const resolve = createRuntimeConfigResolver({
      envConfig: { apiUrl: 'env-url', apiKey: 'env-key', model: 'env-model' },
    });
    expect(resolve({
      apiUrlConfig: 'page-url',
      apiKeyConfig: 'page-key',
      modelConfig: 'page-model',
    })).toEqual({
      mode: 'direct',
      apiUrl: 'page-url',
      apiKey: 'page-key',
      model: 'page-model',
    });
  });

  test('falls back to env config when page config is empty (direct mode)', () => {
    const resolve = createRuntimeConfigResolver({
      envConfig: { apiUrl: 'env-url', apiKey: 'env-key', model: 'env-model' },
    });
    expect(resolve({
      apiUrlConfig: '',
      apiKeyConfig: '',
      modelConfig: '',
    })).toEqual({
      mode: 'direct',
      apiUrl: 'env-url',
      apiKey: 'env-key',
      model: 'env-model',
    });
  });

  test('throws on desktop when api key is missing', () => {
    const resolve = createRuntimeConfigResolver({
      envConfig: { apiUrl: 'env-url', apiKey: '', model: 'env-model' },
      isTauri: true,
    });
    expect(() => resolve({ apiUrlConfig: '', apiKeyConfig: '', modelConfig: '' }))
      .toThrow('缺少 Gemini API Key，请在设置中填入 API Key');
  });

  test('returns proxy mode on web when key is empty but access token present', () => {
    const resolve = createRuntimeConfigResolver({
      envConfig: { apiUrl: 'env-url', apiKey: '', model: 'env-model' },
      isTauri: false,
    });
    expect(resolve({
      apiUrlConfig: '',
      apiKeyConfig: '',
      modelConfig: '',
      accessTokenConfig: 'my-pass',
    })).toEqual({
      mode: 'proxy',
      apiUrl: '/api/gemini/v1beta',
      accessToken: 'my-pass',
      model: 'env-model',
    });
  });

  test('throws on web when both key and access token are missing', () => {
    const resolve = createRuntimeConfigResolver({
      envConfig: { apiUrl: 'env-url', apiKey: '', model: 'env-model' },
      isTauri: false,
    });
    expect(() => resolve({ apiUrlConfig: '', apiKeyConfig: '', modelConfig: '', accessTokenConfig: '' }))
      .toThrow('缺少访问口令');
  });

  test('strips models/ prefix from model name', () => {
    const resolve = createRuntimeConfigResolver({
      envConfig: { apiUrl: 'u', apiKey: 'k', model: 'm' },
    });
    const result = resolve({ apiUrlConfig: '', apiKeyConfig: 'k', modelConfig: 'models/gemini-2.5-flash' });
    expect(result.model).toBe('gemini-2.5-flash');
  });
});

describe('buildGeminiEndpoint', () => {
  test('builds standard endpoint', () => {
    const url = buildGeminiEndpoint('https://api.example.com/v1beta', 'gemini-2.5-flash', 'test-key');
    expect(url).toContain('streamGenerateContent');
    expect(url).toContain('alt=sse');
    expect(url).toContain('key=test-key');
    expect(url).toContain('gemini-2.5-flash');
  });

  test('preserves pre-built streamGenerateContent url', () => {
    const input = 'https://api.example.com/v1beta/models/gemini:streamGenerateContent';
    const url = buildGeminiEndpoint(input, 'unused', 'mykey');
    expect(url).toContain(':streamGenerateContent');
    expect(url).toContain('alt=sse');
    expect(url).toContain('key=mykey');
  });

  test('does not duplicate alt param', () => {
    const input = 'https://api.example.com/v1beta/models/gemini:streamGenerateContent?alt=sse';
    const url = buildGeminiEndpoint(input, 'unused', 'mykey');
    expect(url.match(/alt=sse/g)).toHaveLength(1);
  });

  test('omits key param in proxy mode (no api key)', () => {
    const url = buildGeminiEndpoint('/api/gemini/v1beta', 'gemini-2.5-flash', '');
    expect(url).toBe('/api/gemini/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse');
    expect(url).not.toContain('key=');
  });
});
