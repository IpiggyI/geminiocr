import { TextDecoder, TextEncoder } from 'util';
import { streamGeminiContent } from './streamGeminiContent';

// CRA 的 jsdom 环境没有 TextEncoder/TextDecoder
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

const createSseResponse = (lines) => {
  const encoder = new TextEncoder();
  let sent = false;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: encoder.encode(lines.join('\n')) };
        },
      }),
    },
  };
};

describe('streamGeminiContent', () => {
  afterEach(() => {
    delete global.fetch;
  });

  test('forwards abort signal to fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue(createSseResponse([
      'data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}',
    ]));
    const controller = new AbortController();
    const chunks = [];

    await streamGeminiContent({
      endpoint: 'https://example.com/stream',
      prompt: 'p',
      onTextChunk: (text) => chunks.push(text),
      signal: controller.signal,
    });

    expect(global.fetch.mock.calls[0][1].signal).toBe(controller.signal);
    expect(chunks).toEqual(['hi']);
  });

  test('rejects when fetch aborts', async () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(streamGeminiContent({
      endpoint: 'https://example.com/stream',
      prompt: 'p',
      onTextChunk: () => {},
      signal: new AbortController().signal,
    })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
