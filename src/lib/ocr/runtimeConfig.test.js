import { createRuntimeConfigResolver, buildGeminiEndpoint } from './runtimeConfig';

describe('createRuntimeConfigResolver', () => {
  test('prefers page config over env config', () => {
    const resolve = createRuntimeConfigResolver({
      envConfig: { apiUrl: 'env-url', apiKey: 'env-key', model: 'env-model' },
    });
    expect(resolve({
      apiUrlConfig: 'page-url',
      apiKeyConfig: 'page-key',
      modelConfig: 'page-model',
    })).toEqual({
      apiUrl: 'page-url',
      apiKey: 'page-key',
      model: 'page-model',
    });
  });

  test('falls back to env config when page config is empty', () => {
    const resolve = createRuntimeConfigResolver({
      envConfig: { apiUrl: 'env-url', apiKey: 'env-key', model: 'env-model' },
    });
    expect(resolve({
      apiUrlConfig: '',
      apiKeyConfig: '',
      modelConfig: '',
    })).toEqual({
      apiUrl: 'env-url',
      apiKey: 'env-key',
      model: 'env-model',
    });
  });

  test('throws when api key is missing', () => {
    const resolve = createRuntimeConfigResolver({
      envConfig: { apiUrl: 'env-url', apiKey: '', model: 'env-model' },
    });
    expect(() => resolve({ apiUrlConfig: '', apiKeyConfig: '', modelConfig: '' })).toThrow();
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
});
