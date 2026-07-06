import { renderHook, act } from '@testing-library/react';

jest.mock('../lib/ocr/streamGeminiContent');
jest.mock('../components/Toast', () => ({ toast: jest.fn() }));
jest.mock('../lib/pdf/pdfToImageDataUrls', () => ({ pdfToImageDataUrls: jest.fn() }));
jest.mock('../lib/files/dataUrlToFile', () => ({ dataUrlToFile: jest.fn() }));

import { useOcrSession } from './useOcrSession';
import { streamGeminiContent } from '../lib/ocr/streamGeminiContent';
import { toast } from '../components/Toast';
import { pdfToImageDataUrls } from '../lib/pdf/pdfToImageDataUrls';
import { dataUrlToFile } from '../lib/files/dataUrlToFile';

const imageFile = () => new File(['x'], 'demo.png', { type: 'image/png' });
const pdfFile = () => new File(['pdf'], 'demo.pdf', { type: 'application/pdf' });
const pageFile = (name) => new File([name], name, { type: 'image/jpeg' });
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
  pdfToImageDataUrls.mockReset();
  dataUrlToFile.mockReset();
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

test('clearSession revokes blob previews and resets all result state', () => {
  const originalRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = jest.fn();

  const { result } = renderHook(() => useOcrSession({}));

  act(() => {
    result.current.setImages(['blob:demo-1', 'data:image/png;base64,xxx']);
    result.current.setResults(['r0', 'r1']);
    result.current.setTranslations(['t0']);
    result.current.setErrors(['e0']);
    result.current.setFiles([imageFile()]);
    result.current.setCurrentIndex(1);
  });

  act(() => { result.current.clearSession(); });

  // 仅撤销 blob: 预览，data: URL 不撤销
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:demo-1');
  expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('data:image/png;base64,xxx');
  expect(result.current.images).toEqual([]);
  expect(result.current.results).toEqual([]);
  expect(result.current.translations).toEqual([]);
  expect(result.current.errors).toEqual([]);
  expect(result.current.files).toEqual([]);
  expect(result.current.currentIndex).toBe(0);

  URL.revokeObjectURL = originalRevoke;
});

test('retryRecognition re-runs with retry hint appended to prompt', async () => {
  let lastPrompt = '';
  streamGeminiContent.mockImplementation(async ({ prompt, onTextChunk }) => {
    lastPrompt = prompt;
    onTextChunk('redo');
  });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);
  act(() => {
    result.current.setImages(['blob:x']);
    result.current.setResults(['']);
    result.current.setFiles([imageFile()]);
  });

  await act(async () => {
    await result.current.retryRecognition(0);
    await flush();
  });

  expect(lastPrompt).toContain('上一次识别可能不完整'); // RETRY_HINT 已追加
  expect(result.current.results[0]).toBe('redo');
});

test('retryRecognition is a no-op when the original file is missing', async () => {
  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);

  await act(async () => { await result.current.retryRecognition(3); });

  expect(streamGeminiContent).not.toHaveBeenCalled();
});

test('retryRecognition re-runs a failed PDF page with the page image file', async () => {
  pdfToImageDataUrls.mockResolvedValue(['data:image/jpeg;base64,page1']);
  dataUrlToFile.mockResolvedValue(pageFile('page_1.jpg'));
  streamGeminiContent
    .mockRejectedValueOnce(new Error('first-fail'))
    .mockImplementationOnce(async ({ onTextChunk }) => { onTextChunk('retry-ok'); });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);

  await act(async () => {
    await result.current.handleFile(pdfFile(), 0);
    await flush();
  });

  expect(result.current.files[0].name).toBe('page_1.jpg');

  await act(async () => {
    await result.current.retryRecognition(0);
    await flush();
  });

  expect(streamGeminiContent).toHaveBeenCalledTimes(2);
  expect(result.current.results[0]).toBe('retry-ok');
});

test('clearSession prevents resolved PDF conversion from restoring page previews', async () => {
  let resolvePdf;
  pdfToImageDataUrls.mockImplementation(() => new Promise((resolve) => { resolvePdf = resolve; }));
  dataUrlToFile.mockResolvedValue(pageFile('page_1.jpg'));
  streamGeminiContent.mockImplementation(async ({ onTextChunk }) => { onTextChunk('late-page'); });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);

  let pendingUpload;
  await act(async () => {
    pendingUpload = result.current.uploadFiles([pdfFile()]);
    await flush();
  });
  expect(result.current.images).toHaveLength(1);

  act(() => { result.current.clearSession(); });

  await act(async () => {
    resolvePdf(['data:image/jpeg;base64,page1']);
    await pendingUpload;
    await flush();
  });

  expect(result.current.images).toEqual([]);
  expect(result.current.results).toEqual([]);
  expect(dataUrlToFile).not.toHaveBeenCalled();
});

test('uploadFiles keeps later image indices aligned after PDF expands to pages', async () => {
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:image-preview');
  pdfToImageDataUrls.mockResolvedValue([
    'data:image/jpeg;base64,page1',
    'data:image/jpeg;base64,page2',
  ]);
  dataUrlToFile.mockImplementation(async (_dataUrl, fileName, mimeType) =>
    new File([fileName], fileName, { type: mimeType })
  );
  let call = 0;
  streamGeminiContent.mockImplementation(async ({ onTextChunk }) => {
    call += 1;
    onTextChunk(`text-${call}`);
  });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);

  try {
    await act(async () => {
      await result.current.uploadFiles([pdfFile(), imageFile()]);
      await flush();
    });

    expect(result.current.results).toEqual(['text-1', 'text-2', 'text-3']);
    expect(result.current.files.map(file => file?.name)).toEqual(['page_1.jpg', 'page_2.jpg', 'demo.png']);
  } finally {
    URL.createObjectURL = originalCreateObjectURL;
  }
});

test('clearSession drops in-flight streaming writes (no resurrection)', async () => {
  let emit;
  streamGeminiContent.mockImplementation(({ onTextChunk }) =>
    new Promise((resolve) => {
      emit = (t) => { onTextChunk(t); resolve(); };
    })
  );

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);
  act(() => { result.current.setResults(['原文']); });

  // translateResult 同步直连 streamClient，emit 立即就绪
  let pending;
  act(() => { pending = result.current.translateResult(0, '原文'); });
  act(() => { result.current.clearSession(); }); // 代际递增

  await act(async () => {
    emit('迟到译文'); // 迟到的流式块
    await pending;
    await flush();
  });

  expect(result.current.translations).toEqual([]); // 未被复活
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

test('custom OCR prompt reaches the model; clearing it falls back to the built-in default', async () => {
  let lastPrompt = '';
  streamGeminiContent.mockImplementation(async ({ prompt, onTextChunk }) => {
    lastPrompt = prompt;
    onTextChunk('x');
  });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);

  act(() => { result.current.setOcrPromptConfig('我的自定义 OCR 提示词'); });
  await act(async () => { await result.current.handleFile(imageFile(), 0); await flush(); });
  expect(lastPrompt).toContain('我的自定义 OCR 提示词');

  act(() => { result.current.setOcrPromptConfig(''); });
  await act(async () => { await result.current.handleFile(imageFile(), 1); await flush(); });
  expect(lastPrompt).toContain('请识别图片中的文字内容'); // 内置默认
});

test('custom translate prompt is applied with {lang}/{content} substitution', async () => {
  let lastPrompt = '';
  streamGeminiContent.mockImplementation(async ({ prompt, onTextChunk }) => {
    lastPrompt = prompt;
    onTextChunk('译');
  });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);
  act(() => {
    result.current.setResults(['源文本']);
    result.current.setTranslatePromptConfig('自定义翻译到 {lang}：{content}');
  });

  await act(async () => { await result.current.translateResult(0); });
  expect(lastPrompt).toContain('自定义翻译到 中文：');
  expect(lastPrompt).toContain('源文本');
});

test('missing API key error attaches a "去设置" guidance action to the toast', async () => {
  const onNeedApiKey = jest.fn();
  streamGeminiContent.mockRejectedValue(new Error('缺少 Gemini API Key，请在设置中填入 API Key'));

  const { result } = renderHook(() => useOcrSession({ onNeedApiKey }));
  withDirectConfig(result);

  await act(async () => { await result.current.handleFile(imageFile(), 0); });

  const errorToast = toast.mock.calls.find(([msg]) => msg.includes('缺少 Gemini API Key'));
  expect(errorToast).toBeDefined();
  expect(errorToast[1].action).toMatchObject({ label: '去设置' });

  // 点击引导动作触发回调（App 层跳设置并聚焦 Key）
  errorToast[1].action.onClick();
  expect(onNeedApiKey).toHaveBeenCalled();
});

test('custom correction prompt is applied; missing {content} degrades to append', async () => {
  let lastPrompt = '';
  streamGeminiContent.mockImplementation(async ({ prompt, onTextChunk }) => {
    lastPrompt = prompt;
    onTextChunk('fixed');
  });

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);

  // 缺 {content} 占位符 → 降级为追加原文，不丢文本
  act(() => {
    result.current.setResults(['待纠错内容']);
    result.current.setCorrectionPromptConfig('只修 LaTeX 公式');
  });
  await act(async () => { await result.current.correctCurrentText(); });
  expect(lastPrompt).toContain('只修 LaTeX 公式');
  expect(lastPrompt).toContain('待纠错内容');
});

test('correction failure shows a toast and keeps the original text', async () => {
  streamGeminiContent.mockRejectedValue(new Error('correct-boom'));

  const { result } = renderHook(() => useOcrSession());
  withDirectConfig(result);
  act(() => { result.current.setResults(['待纠错内容']); });

  await act(async () => { await result.current.correctCurrentText(); });

  expect(result.current.results[0]).toBe('待纠错内容');
  expect(toast).toHaveBeenCalledWith('纠错失败：correct-boom', { type: 'error' });
});
