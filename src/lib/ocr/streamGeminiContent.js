import { GENERATION_CONFIG } from './runtimeConfig';

/**
 * 从 Gemini SSE payload 中提取文本
 */
const extractGeminiChunkText = (payload) =>
  (payload.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('');

/**
 * 向 Gemini API 发送流式请求，逐 chunk 回调文本
 * @param {{ endpoint: string, prompt: string, imageData?: string, mimeType?: string, onTextChunk: (text: string) => void }} options
 */
export const streamGeminiContent = async ({ endpoint, prompt, imageData, mimeType, onTextChunk }) => {
  const parts = [{ text: prompt }];

  if (imageData && mimeType) {
    parts.push({
      inline_data: {
        data: imageData,
        mime_type: mimeType,
      },
    });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: GENERATION_CONFIG,
    }),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorBody = await response.json();
      errorDetail = errorBody?.error?.message || JSON.stringify(errorBody);
    } catch (error) {
      errorDetail = await response.text();
    }
    throw new Error(`Gemini API 请求失败 (${response.status}): ${errorDetail || response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Gemini API 未返回可读取的流式响应');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const consumeLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;

    const rawPayload = trimmed.slice(5).trim();
    if (!rawPayload || rawPayload === '[DONE]') return;

    try {
      const payload = JSON.parse(rawPayload);
      const chunkText = extractGeminiChunkText(payload);
      if (chunkText) onTextChunk(chunkText);
    } catch (error) {
      console.error('Gemini SSE 数据解析失败:', error);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(consumeLine);
  }

  if (buffer.trim()) {
    consumeLine(buffer);
  }
};
