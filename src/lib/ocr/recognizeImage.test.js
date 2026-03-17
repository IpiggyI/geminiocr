import { recognizeImage } from './recognizeImage';

test('joins streaming chunks into final result', async () => {
  const chunks = [];
  const result = await recognizeImage({
    file: new File(['x'], 'demo.png', { type: 'image/png' }),
    translateLang: '',
    streamClient: async ({ onTextChunk }) => {
      onTextChunk('hello');
      onTextChunk(' world');
    },
    onTextChunk: (chunk) => chunks.push(chunk),
  });

  expect(result).toBe('hello world');
  expect(chunks).toEqual(['hello', ' world']);
});

test('returns empty string for non-image file', async () => {
  const result = await recognizeImage({
    file: new File(['x'], 'demo.txt', { type: 'text/plain' }),
    translateLang: '',
    streamClient: jest.fn(),
    onTextChunk: jest.fn(),
  });
  expect(result).toBe('');
});

test('appends translate instruction when translateLang is provided', async () => {
  let capturedPrompt = '';
  await recognizeImage({
    file: new File(['x'], 'demo.png', { type: 'image/png' }),
    translateLang: '中文',
    streamClient: async ({ prompt, onTextChunk }) => {
      capturedPrompt = prompt;
      onTextChunk('翻译结果');
    },
    onTextChunk: () => {},
  });

  expect(capturedPrompt).toContain('翻译');
  expect(capturedPrompt).toContain('中文');
});
