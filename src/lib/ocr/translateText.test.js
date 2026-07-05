import { translateText } from './translateText';

test('builds translate prompt with target language and content, joins chunks', async () => {
  let capturedPrompt = '';
  const chunks = [];
  const result = await translateText({
    text: 'hello',
    lang: '中文',
    streamClient: async ({ prompt, onTextChunk }) => {
      capturedPrompt = prompt;
      onTextChunk('你好');
    },
    onTextChunk: (chunk) => chunks.push(chunk),
  });

  expect(capturedPrompt).toContain('翻译成中文');
  expect(capturedPrompt).toContain('hello');
  expect(result).toBe('你好');
  expect(chunks).toEqual(['你好']);
});

test('preserves $$ formulas and braces in content (no regex replacement artifacts)', async () => {
  let capturedPrompt = '';
  await translateText({
    text: '$$f(x) = x^2$$ 和 \\frac{a}{b}',
    lang: 'English',
    streamClient: async ({ prompt, onTextChunk }) => {
      capturedPrompt = prompt;
      onTextChunk('x');
    },
    onTextChunk: () => {},
  });

  expect(capturedPrompt).toContain('$$f(x) = x^2$$');
  expect(capturedPrompt).toContain('\\frac{a}{b}');
});

test('falls back to 中文 when lang is blank', async () => {
  let capturedPrompt = '';
  await translateText({
    text: 'hi',
    lang: '  ',
    streamClient: async ({ prompt, onTextChunk }) => {
      capturedPrompt = prompt;
      onTextChunk('x');
    },
    onTextChunk: () => {},
  });

  expect(capturedPrompt).toContain('翻译成中文');
});
