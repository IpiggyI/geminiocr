import { OCR_PROMPT, RETRY_HINT } from './prompts';
import { preprocessText } from './preprocessText';
import { readFileAsDataUrl } from '../files/readFileAsDataUrl';

/**
 * 识别图片中的文字
 * @param {{ file: File, retryHint?: boolean, streamClient: Function, onTextChunk: Function }} options
 * @returns {Promise<string>} 识别并后处理后的文本
 */
export const recognizeImage = async ({ file, retryHint, streamClient, onTextChunk }) => {
  if (!file || !file.type.startsWith('image/')) return '';

  const dataUrl = await readFileAsDataUrl(file);
  const imageData = dataUrl.split(',')[1];

  let prompt = OCR_PROMPT;
  if (retryHint) {
    prompt = `${prompt}\n\n${RETRY_HINT}`;
  }

  let fullText = '';
  await streamClient({
    prompt,
    imageData,
    mimeType: file.type,
    onTextChunk: (chunk) => {
      fullText += chunk;
      onTextChunk(chunk);
    },
  });

  return preprocessText(fullText);
};
