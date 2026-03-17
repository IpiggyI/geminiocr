import { OCR_PROMPT, appendTranslateInstruction } from './prompts';
import { preprocessText } from './preprocessText';
import { readFileAsDataUrl } from '../files/readFileAsDataUrl';

/**
 * 识别图片中的文字
 * @param {{ file: File, translateLang?: string, streamClient: Function, onTextChunk: Function }} options
 * @returns {Promise<string>} 识别并后处理后的文本
 */
export const recognizeImage = async ({ file, translateLang, streamClient, onTextChunk }) => {
  if (!file || !file.type.startsWith('image/')) return '';

  const dataUrl = await readFileAsDataUrl(file);
  const imageData = dataUrl.split(',')[1];

  let prompt = OCR_PROMPT;
  if (translateLang) {
    prompt = appendTranslateInstruction(prompt, translateLang);
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
