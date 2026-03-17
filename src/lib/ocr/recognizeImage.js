import { OCR_PROMPT, appendTranslateInstruction } from './prompts';
import { preprocessText } from './preprocessText';

/**
 * 读取 File 为 base64 DataURL
 */
const readFileAsBase64 = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

/**
 * 识别图片中的文字
 * @param {{ file: File, translateLang?: string, streamClient: Function, onTextChunk: Function }} options
 * @returns {Promise<string>} 识别并后处理后的文本
 */
export const recognizeImage = async ({ file, translateLang, streamClient, onTextChunk }) => {
  if (!file || !file.type.startsWith('image/')) return '';

  const dataUrl = await readFileAsBase64(file);
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
