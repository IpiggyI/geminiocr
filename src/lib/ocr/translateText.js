import { TRANSLATE_PROMPT } from './prompts';

/**
 * 将文本翻译成目标语言（两段式翻译的第二段，独立于 OCR 请求）
 * @param {{ text: string, lang?: string, streamClient: Function, onTextChunk: Function }} options
 * @returns {Promise<string>} 翻译后的文本
 */
export const translateText = async ({ text, lang, streamClient, onTextChunk }) => {
  const target = (lang && lang.trim()) || '中文';
  // 用函数替换，避免 {content} 里的 $$公式$$ 被当作正则替换特殊符号吞掉
  const prompt = TRANSLATE_PROMPT
    .replace('{lang}', () => target)
    .replace('{content}', () => text);

  let translated = '';
  await streamClient({
    prompt,
    onTextChunk: (chunk) => {
      translated += chunk;
      onTextChunk(chunk);
    },
  });

  return translated;
};
