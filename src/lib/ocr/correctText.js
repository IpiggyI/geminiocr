import { CORRECTION_PROMPT } from './prompts';

/**
 * 对 OCR 结果进行纠错
 * @param {{ text: string, streamClient: Function, onTextChunk: Function }} options
 * @returns {Promise<string>} 纠错后的文本
 */
export const correctText = async ({ text, streamClient, onTextChunk }) => {
  const prompt = CORRECTION_PROMPT.replace('{content}', text);
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
