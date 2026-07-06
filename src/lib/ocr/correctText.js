import { DEFAULT_CORRECTION_PROMPT } from './prompts';

/**
 * 对 OCR 结果进行纠错
 * @param {{ text: string, promptTemplate?: string, streamClient: Function, onTextChunk: Function }} options
 * @returns {Promise<string>} 纠错后的文本
 */
export const correctText = async ({ text, promptTemplate = DEFAULT_CORRECTION_PROMPT, streamClient, onTextChunk }) => {
  // 用函数替换避免 {content} 里的 $$公式$$ 被当作正则替换符号吞掉；
  // 自定义模板缺 {content} 占位符时降级为「追加到末尾」，不报错、不丢文本
  const prompt = promptTemplate.includes('{content}')
    ? promptTemplate.replace('{content}', () => text)
    : `${promptTemplate}\n\n${text}`;
  let correctedText = '';

  await streamClient({
    prompt,
    onTextChunk: (chunk) => {
      correctedText += chunk;
      onTextChunk(chunk);
    },
  });

  return correctedText;
};
