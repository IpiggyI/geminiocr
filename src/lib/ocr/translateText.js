import { DEFAULT_TRANSLATE_PROMPT } from './prompts';

/**
 * 将文本翻译成目标语言（两段式翻译的第二段，独立于 OCR 请求）
 * @param {{ text: string, lang?: string, promptTemplate?: string, streamClient: Function, onTextChunk: Function }} options
 * @returns {Promise<string>} 翻译后的文本
 */
export const translateText = async ({ text, lang, promptTemplate = DEFAULT_TRANSLATE_PROMPT, streamClient, onTextChunk }) => {
  const target = (lang && lang.trim()) || '中文';
  // 用函数替换，避免 {content} 里的 $$公式$$ 被当作正则替换特殊符号吞掉；
  // 自定义模板缺占位符时降级：{content} 缺失则追加到末尾，{lang} 缺失则不注入
  let prompt = promptTemplate.includes('{lang}')
    ? promptTemplate.replace('{lang}', () => target)
    : promptTemplate;
  prompt = prompt.includes('{content}')
    ? prompt.replace('{content}', () => text)
    : `${prompt}\n\n${text}`;

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
