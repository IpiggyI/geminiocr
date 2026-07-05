import { evaluateProxyAccess, buildUpstreamUrl, DEFAULT_GEMINI_API_BASE } from './geminiProxy';

describe('evaluateProxyAccess', () => {
  test('rejects non-POST with 405', () => {
    expect(evaluateProxyAccess({ method: 'GET', accessToken: 'x', expectedToken: 'x' }))
      .toEqual({ status: 405, message: 'Method not allowed' });
  });

  test('returns 503 when access token env is not configured', () => {
    expect(evaluateProxyAccess({ method: 'POST', accessToken: 'x', expectedToken: '' }))
      .toEqual({ status: 503, message: 'Proxy not configured' });
  });

  test('returns 401 when token does not match', () => {
    expect(evaluateProxyAccess({ method: 'POST', accessToken: 'wrong', expectedToken: 'right' }))
      .toEqual({ status: 401, message: 'Invalid access token' });
  });

  test('passes (null) with correct token on POST', () => {
    expect(evaluateProxyAccess({ method: 'POST', accessToken: 'right', expectedToken: 'right' }))
      .toBeNull();
  });
});

describe('buildUpstreamUrl', () => {
  test('joins tail path onto upstream base and preserves query', () => {
    const url = buildUpstreamUrl({
      tailPath: 'models/gemini-2.5-flash:streamGenerateContent',
      query: { __path: 'models/gemini-2.5-flash:streamGenerateContent', alt: 'sse' },
      upstreamBase: DEFAULT_GEMINI_API_BASE,
    });
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse');
  });

  test('injects server apiKey as ?key= and overrides client-supplied key', () => {
    const url = buildUpstreamUrl({
      tailPath: 'models/x:streamGenerateContent',
      query: { __path: 'models/x:streamGenerateContent', alt: 'sse', key: 'leaked' },
      upstreamBase: DEFAULT_GEMINI_API_BASE,
      apiKey: 'server-key',
    });
    expect(url).toContain('key=server-key');
    expect(url).not.toContain('leaked');
    expect(url).not.toContain('__path');
    expect(url).toContain('alt=sse');
  });

  test('honors custom upstream base (mirror) and normalizes trailing slash', () => {
    const url = buildUpstreamUrl({
      tailPath: 'models/x:streamGenerateContent',
      query: { alt: 'sse' },
      upstreamBase: 'https://mirror.example.com/v1beta/',
      apiKey: 'k',
    });
    expect(url).toBe('https://mirror.example.com/v1beta/models/x:streamGenerateContent?alt=sse&key=k');
  });
});
