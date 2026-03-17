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
