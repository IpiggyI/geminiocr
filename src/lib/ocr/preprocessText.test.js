import { preprocessText } from './preprocessText';

test('preserves markdown table placeholders during normalization', () => {
  const input = '| A | B |\n|---|---|\n| 1 | 2 |\n\n\\\\(x+1\\\\)';
  const output = preprocessText(input);
  expect(output).toContain('| A | B |');
});

test('normalizes inline latex delimiters \\\\( \\\\) to $', () => {
  const input = '\\\\(x^2\\\\)';
  const output = preprocessText(input);
  expect(output).toContain('$x^2$');
});

test('normalizes block latex delimiters \\\\[ \\\\] to $', () => {
  // 注意：String.replace 中 '$$' 是特殊转义，替换结果为单个 $
  // 这是原始 App.js 的行为，保持一致
  const input = '\\\\[y=x+1\\\\]';
  const output = preprocessText(input);
  expect(output).toContain('$y=x+1$');
});

test('returns empty string for falsy input', () => {
  expect(preprocessText('')).toBe('');
  expect(preprocessText(null)).toBe('');
  expect(preprocessText(undefined)).toBe('');
});

test('strips code fences and language identifiers', () => {
  const input = '```markdown\nhello world\n```';
  const output = preprocessText(input);
  expect(output).not.toContain('```');
  expect(output).toContain('hello world');
});

test('normalizes block formula spacing', () => {
  const input = 'text\n$$f(x)=1$$\nmore text';
  const output = preprocessText(input);
  expect(output).toContain('$$f(x)=1$$');
  expect(output).not.toMatch(/\n{3,}/);
});
