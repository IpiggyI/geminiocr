import { renderHook, act } from '@testing-library/react';

jest.mock('../lib/ocr/streamGeminiContent');
jest.mock('../components/Toast', () => ({ toast: jest.fn() }));

import { useOcrSession } from './useOcrSession';
import { streamGeminiContent } from '../lib/ocr/streamGeminiContent';
import { toast } from '../components/Toast';

const imageFile = () => new File(['x'], 'demo.png', { type: 'image/png' });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// 给 hook 一个「页面填 Key」直连配置，避免走口令代理分支报错
const withDirectConfig = (result) => {
  act(() => {
    result.current.setApiKeyConfig('test-key');
    result.current.setApiUrlConfig('https://example.com/v1beta');
    result.current.setModelConfig('gemini-2.5-flash');
  });
};

beforeEach(() => {
  window.localStorage.clear();
  streamGeminiContent.mockReset();
  toast.mockReset();
});

test('exposes unified session actions', () => {
  const { result } = renderHook(() => useOcrSession({}));
  expect(typeof result.current.uploadFiles).toBe('function');
  expect(typeof result.current.processClipboardImage).toBe('function');
  expect(typeof result.current.correctCurrentText).toBe('function');
  expect(typeof result.current.cancelRecognition).toBe('function');
  expect(typeof result.current.handleFile).toBe('function');
  expect(typeof result.current.handlePrevImage).toBe('function');
  expect(typeof result.current.handleNextImage).toBe('function');
});

test('exposes state properties', () => {
  const { result } = renderHook(() => useOcrSession({}));
  expect(result.current.images).toEqual([]);
  expect(result.current.results).toEqual([]);
  expect(result.current.currentIndex).toBe(0);
  expect(result.current.isLoading).toBe(false);
  expect(result.current.isCorrectingText).toBe(false);
});

test('navigation bounds are respected', () => {
  const { result } = renderHook(() => useOcrSession({}));

  // prev on empty list does nothing
  act(() => { result.current.handlePrevImage(); });
  expect(result.current.currentIndex).toBe(0);

  // next on empty list does nothing
  act(() => { result.current.handleNextImage(); });
  expect(result.current.currentIndex).toBe(0);
});

test('cancelRecognition resets loading state', () => {
  const { result } = renderHook(() => useOcrSession({}));

  act(() => { result.current.setIsLoading(true); });
  expect(result.current.isLoading).toBe(true);

  act(() => { result.current.cancelRecognition(); });
  expect(result.current.isLoading).toBe(false);
});

test('persists api config to localStorage across remounts', () => {
  window.localStorage.clear();

  const { result, unmount } = renderHook(() => useOcrSession({}));

  act(() => {
    result.current.setApiKeyConfig('persisted-key');
    result.current.setApiUrlConfig('https://example.com');
    result.current.setModelConfig('gemini-2.5-pro');
    result.current.setAccessTokenConfig('persisted-token');
  });

  unmount();

  const { result: nextResult } = renderHook(() => useOcrSession({}));

  expect(nextResult.current.apiKeyConfig).toBe('persisted-key');
  expect(nextResult.current.apiUrlConfig).toBe('https://example.com');
  expect(nextResult.current.modelConfig).toBe('gemini-2.5-pro');
  expect(nextResult.current.accessTokenConfig).toBe('persisted-token');
});

test('recognition is pure OCR when translate disabled; captures files[] and no translation', async () => {
  streamGeminiContent.mockImplementation(async ({ prompt, onTextChunk }) => {
    onTextChunk(prompt.includes('翻译成') ? '你好' : 'hello world');
  });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);

  await act(async () => {
    await result.current.handleFile(imageFile(), 0);
    await flush();
  });

  expect(result.current.results[0]).toBeTruthy();
  expect(result.current.files[0]).toBeInstanceOf(File);
  expect(result.current.translations[0] || '').toBe('');
});

test('auto-translate: after recognition it streams translation into translations[]', async () => {
  streamGeminiContent.mockImplementation(async ({ prompt, onTextChunk }) => {
    onTextChunk(prompt.includes('翻译成') ? '你好世界' : 'hello world');
  });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);
  act(() => { result.current.setTranslateEnabled(true); });

  await act(async () => {
    await result.current.handleFile(imageFile(), 0);
    await flush();
  });

  expect(result.current.results[0]).toBeTruthy();
  expect(result.current.translations[0]).toBe('你好世界');
});

test('recognition failure records errors[] with toast and leaves results[] clean', async () => {
  streamGeminiContent.mockRejectedValue(new Error('boom'));

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);

  await act(async () => {
    await result.current.handleFile(imageFile(), 0);
  });

  expect(result.current.errors[0]).toContain('boom');
  expect(result.current.results[0] || '').not.toContain('boom');
  expect(result.current.results[0] || '').not.toContain('识别失败');
  expect(toast).toHaveBeenCalled();
});

test('translateResult streams translation into translations[]', async () => {
  streamGeminiContent.mockImplementation(async ({ onTextChunk }) => { onTextChunk('译文'); });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);
  act(() => { result.current.setResults(['source text']); });

  await act(async () => { await result.current.translateResult(0); });

  expect(result.current.translations[0]).toBe('译文');
  expect(result.current.translateErrors[0] || '').toBe('');
});

test('translate failure keeps original results intact and records translateErrors[]', async () => {
  streamGeminiContent.mockRejectedValue(new Error('translate-boom'));

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);
  act(() => { result.current.setResults(['原文内容']); });

  await act(async () => { await result.current.translateResult(0); });

  expect(result.current.results[0]).toBe('原文内容');
  expect(result.current.translations[0] || '').toBe('');
  expect(result.current.translateErrors[0]).toContain('translate-boom');
});
