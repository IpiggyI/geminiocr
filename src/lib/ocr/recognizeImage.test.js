import { recognizeImage } from './recognizeImage';

test('joins streaming chunks into final result', async () => {
  const chunks = [];
  const result = await recognizeImage({
    file: new File(['x'], 'demo.png', { type: 'image/png' }),
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
    streamClient: jest.fn(),
    onTextChunk: jest.fn(),
  });
  expect(result).toBe('');
});
