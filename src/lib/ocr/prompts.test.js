import {
  resolvePrompt,
  DEFAULT_OCR_PROMPT,
  DEFAULT_CORRECTION_PROMPT,
  DEFAULT_TRANSLATE_PROMPT,
} from './prompts';

test('resolvePrompt returns custom value when non-empty', () => {
  expect(resolvePrompt('我的提示词', DEFAULT_OCR_PROMPT)).toBe('我的提示词');
});

test('resolvePrompt falls back to default on empty / whitespace / undefined', () => {
  expect(resolvePrompt('', DEFAULT_OCR_PROMPT)).toBe(DEFAULT_OCR_PROMPT);
  expect(resolvePrompt('   ', DEFAULT_OCR_PROMPT)).toBe(DEFAULT_OCR_PROMPT);
  expect(resolvePrompt(undefined, DEFAULT_OCR_PROMPT)).toBe(DEFAULT_OCR_PROMPT);
});

test('correction prompt is renumbered sequentially (item 4 no longer skipped)', () => {
  expect(DEFAULT_CORRECTION_PROMPT).toContain('4. 不要添加任何解释，直接输出修正后的内容');
  expect(DEFAULT_CORRECTION_PROMPT).toContain('5. 修正之后的数据一定是要可以正确解析的');
});

test('default templates carry expected placeholders', () => {
  expect(DEFAULT_TRANSLATE_PROMPT).toContain('{lang}');
  expect(DEFAULT_TRANSLATE_PROMPT).toContain('{content}');
  expect(DEFAULT_CORRECTION_PROMPT).toContain('{content}');
});
