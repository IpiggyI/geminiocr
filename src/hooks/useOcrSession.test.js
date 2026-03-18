import { renderHook, act } from '@testing-library/react';
import { useOcrSession } from './useOcrSession';

test('exposes unified session actions', () => {
  const { result } = renderHook(() => useOcrSession({}));
  expect(typeof result.current.uploadFiles).toBe('function');
  expect(typeof result.current.processClipboardImage).toBe('function');
  expect(typeof result.current.correctCurrentText).toBe('function');
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

test('persists api config to localStorage across remounts', () => {
  window.localStorage.clear();

  const { result, unmount } = renderHook(() => useOcrSession({}));

  act(() => {
    result.current.setApiKeyConfig('persisted-key');
    result.current.setApiUrlConfig('https://example.com');
    result.current.setModelConfig('gemini-2.5-pro');
  });

  unmount();

  const { result: nextResult } = renderHook(() => useOcrSession({}));

  expect(nextResult.current.apiKeyConfig).toBe('persisted-key');
  expect(nextResult.current.apiUrlConfig).toBe('https://example.com');
  expect(nextResult.current.modelConfig).toBe('gemini-2.5-pro');
});
