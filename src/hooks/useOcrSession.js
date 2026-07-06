import { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_GEMINI_API_URL, DEFAULT_GEMINI_MODEL, createRuntimeConfigResolver, buildGeminiEndpoint } from '../lib/ocr/runtimeConfig';
import { streamGeminiContent } from '../lib/ocr/streamGeminiContent';
import { recognizeImage } from '../lib/ocr/recognizeImage';
import { correctText } from '../lib/ocr/correctText';
import { translateText } from '../lib/ocr/translateText';
import { DEFAULT_OCR_PROMPT, DEFAULT_CORRECTION_PROMPT, DEFAULT_TRANSLATE_PROMPT, resolvePrompt } from '../lib/ocr/prompts';
import { dataUrlToFile } from '../lib/files/dataUrlToFile';
import { pdfToImageDataUrls } from '../lib/pdf/pdfToImageDataUrls';
import { isTauri } from '../desktop/tauriBridge';
import { toast } from '../components/Toast';

const API_CONFIG_STORAGE_KEYS = {
  apiUrl: 'geminiocr-api-url-config',
  apiKey: 'geminiocr-api-key-config',
  model: 'geminiocr-model-config',
  accessToken: 'geminiocr-access-token',
};

// 自定义提示词存储键（空串=未自定义，回落内置默认）
const PROMPT_STORAGE_KEYS = {
  ocr: 'geminiocr-prompt-ocr',
  translate: 'geminiocr-prompt-translate',
  correction: 'geminiocr-prompt-correction',
};

// 默认翻译目标语言存储键
const TRANSLATE_LANG_STORAGE_KEY = 'geminiocr-translate-lang';

const readStoredValue = (key) => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(key) || '';
};

const writeStoredValue = (key, value) => {
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(key, value);
  } else {
    window.localStorage.removeItem(key);
  }
};

/**
 * 统一管理 OCR 会话状态与动作
 * Web 端和 Desktop 端共用
 * @param {{ onNeedApiKey?: () => void }} [options] 识别报缺 Key/口令时的引导回调（打开设置并聚焦）
 */
export const useOcrSession = ({ onNeedApiKey } = {}) => {
  const onNeedApiKeyRef = useRef(onNeedApiKey);
  onNeedApiKeyRef.current = onNeedApiKey;
  // ─── 核心状态 ───
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCorrectingText, setIsCorrectingText] = useState(false);

  // ─── 结果衍生状态（按 index 与 results 对齐）───
  const [translations, setTranslations] = useState([]);   // 译文
  const [errors, setErrors] = useState([]);               // 识别错误（不写进 results）
  const [translateErrors, setTranslateErrors] = useState([]); // 翻译错误
  const [files, setFiles] = useState([]);                 // 原始 File 引用（供重试识别）
  const [translating, setTranslating] = useState([]);     // 翻译进行中
  const translateResultRef = useRef(null);                // 打破 handleImageFile → translateResult 依赖环

  // ─── 翻译配置 ───
  const [translateEnabled, setTranslateEnabled] = useState(false);
  // 目标语言持久化：作为「默认翻译语言」跨会话记忆（设置视图桌面组 / Web Toolbar 共用）
  const [translateLang, setTranslateLang] = useState(() => readStoredValue(TRANSLATE_LANG_STORAGE_KEY) || '中文');
  const translateEnabledRef = useRef(false);
  const translateLangRef = useRef('中文');
  useEffect(() => { translateEnabledRef.current = translateEnabled; }, [translateEnabled]);
  useEffect(() => { translateLangRef.current = translateLang; }, [translateLang]);
  useEffect(() => { writeStoredValue(TRANSLATE_LANG_STORAGE_KEY, translateLang); }, [translateLang]);

  // ─── API 配置 ───
  const [apiUrlConfig, setApiUrlConfig] = useState(() => readStoredValue(API_CONFIG_STORAGE_KEYS.apiUrl));
  const [apiKeyConfig, setApiKeyConfig] = useState(() => readStoredValue(API_CONFIG_STORAGE_KEYS.apiKey));
  const [modelConfig, setModelConfig] = useState(() => readStoredValue(API_CONFIG_STORAGE_KEYS.model));
  const [accessTokenConfig, setAccessTokenConfig] = useState(() => readStoredValue(API_CONFIG_STORAGE_KEYS.accessToken));

  useEffect(() => { writeStoredValue(API_CONFIG_STORAGE_KEYS.apiUrl, apiUrlConfig); }, [apiUrlConfig]);
  useEffect(() => { writeStoredValue(API_CONFIG_STORAGE_KEYS.apiKey, apiKeyConfig); }, [apiKeyConfig]);
  useEffect(() => { writeStoredValue(API_CONFIG_STORAGE_KEYS.model, modelConfig); }, [modelConfig]);
  useEffect(() => { writeStoredValue(API_CONFIG_STORAGE_KEYS.accessToken, accessTokenConfig); }, [accessTokenConfig]);

  // ─── 自定义提示词（空串=用内置默认）───
  const [ocrPromptConfig, setOcrPromptConfig] = useState(() => readStoredValue(PROMPT_STORAGE_KEYS.ocr));
  const [translatePromptConfig, setTranslatePromptConfig] = useState(() => readStoredValue(PROMPT_STORAGE_KEYS.translate));
  const [correctionPromptConfig, setCorrectionPromptConfig] = useState(() => readStoredValue(PROMPT_STORAGE_KEYS.correction));

  useEffect(() => { writeStoredValue(PROMPT_STORAGE_KEYS.ocr, ocrPromptConfig); }, [ocrPromptConfig]);
  useEffect(() => { writeStoredValue(PROMPT_STORAGE_KEYS.translate, translatePromptConfig); }, [translatePromptConfig]);
  useEffect(() => { writeStoredValue(PROMPT_STORAGE_KEYS.correction, correctionPromptConfig); }, [correctionPromptConfig]);

  // ref 镜像：稳定的动作 useCallback 在调用时读到最新提示词，不进依赖数组
  const ocrPromptRef = useRef(ocrPromptConfig);
  const translatePromptRef = useRef(translatePromptConfig);
  const correctionPromptRef = useRef(correctionPromptConfig);
  useEffect(() => { ocrPromptRef.current = ocrPromptConfig; }, [ocrPromptConfig]);
  useEffect(() => { translatePromptRef.current = translatePromptConfig; }, [translatePromptConfig]);
  useEffect(() => { correctionPromptRef.current = correctionPromptConfig; }, [correctionPromptConfig]);

  const envConfig = {
    apiUrl: process.env.REACT_APP_GEMINI_API_URL || DEFAULT_GEMINI_API_URL,
    model: process.env.REACT_APP_GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  };

  const resolveConfig = createRuntimeConfigResolver({
    envConfig,
    isTauri: isTauri(),
  });

  // ─── 取消控制 ───
  const abortRef = useRef(null);
  if (!abortRef.current) {
    abortRef.current = new AbortController();
  }
  // 会话代际：clearSession 递增；流式写回前校验，防止清空后异步回调复活结果
  const generationRef = useRef(0);
  // 每 index 的识别尝试次数（重试计次，第 2 次起追加提示词）
  const attemptsRef = useRef([]);

  /** 取消所有进行中的识别/纠错请求，后续请求使用新的控制器 */
  const cancelRecognition = useCallback(() => {
    abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsLoading(false);
    setIsCorrectingText(false);
  }, []);

  // ─── 流式请求客户端 ───
  const callGeminiStream = useCallback(async ({ prompt, imageData, mimeType, onTextChunk }) => {
    const resolved = resolveConfig({ apiUrlConfig, apiKeyConfig, modelConfig, accessTokenConfig });
    const endpoint = buildGeminiEndpoint(resolved.apiUrl, resolved.model, resolved.apiKey);
    const headers = resolved.mode === 'proxy' ? { 'x-access-token': resolved.accessToken } : undefined;
    try {
      return await streamGeminiContent({
        endpoint, prompt, imageData, mimeType, onTextChunk, headers,
        signal: abortRef.current.signal,
      });
    } catch (error) {
      if (error.status === 401) {
        toast('访问口令无效，请在设置中检查访问口令', { type: 'error' });
      }
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrlConfig, apiKeyConfig, modelConfig, accessTokenConfig]);

  // ─── 核心动作 ───

  /** 处理单张图片识别（attempt≥2 时追加重试提示词） */
  const handleImageFile = useCallback(async (file, index, attempt = 1) => {
    if (!file || !file.type.startsWith('image/')) return;
    const gen = generationRef.current; // 捕获本轮代际，回调前校验
    const stale = () => generationRef.current !== gen; // 会话已被清空则丢弃写回
    // 新一轮识别：清掉该 index 上一次的错误态
    setErrors(prev => { const next = [...prev]; next[index] = ''; return next; });
    try {
      let liveText = '';
      const fullText = await recognizeImage({
        file,
        prompt: resolvePrompt(ocrPromptRef.current, DEFAULT_OCR_PROMPT),
        retryHint: attempt >= 2,
        streamClient: callGeminiStream,
        onTextChunk: (chunk) => {
          liveText += chunk;
          setResults(prev => {
            if (stale()) return prev;
            const newResults = [...prev];
            newResults[index] = liveText;
            return newResults;
          });
        },
      });

      setResults(prev => {
        if (stale()) return prev;
        const newResults = [...prev];
        newResults[index] = fullText;
        return newResults;
      });

      // 识别恒为纯 OCR；开启自动翻译时，识别完成后独立触发翻译（不阻塞识别生命周期）
      if (!stale() && translateEnabledRef.current) {
        translateResultRef.current?.(index, fullText);
      }
      return fullText;
    } catch (error) {
      if (error.name === 'AbortError') {
        setResults(prev => {
          if (stale()) return prev; // 已 clearSession，不复活
          const newResults = [...prev];
          newResults[index] = '已取消';
          return newResults;
        });
        return '已取消';
      }
      console.error('Error details:', error);
      const errorMessage = `识别失败：${error.message}`;
      // 错误进错误通道，不写入 results（避免错误文本污染识别结果）
      setErrors(prev => { if (stale()) return prev; const next = [...prev]; next[index] = errorMessage; return next; });
      if (!stale()) {
        // 缺 Key / 缺访问口令 → toast 附「去设置」引导（错误文案含「请在设置中填入」）
        const needsConfig = error.message.includes('请在设置中填入');
        toast(errorMessage, needsConfig && onNeedApiKeyRef.current
          ? { type: 'error', duration: 8000, action: { label: '去设置', onClick: onNeedApiKeyRef.current } }
          : { type: 'error' });
      }
      throw error;
    }
  }, [callGeminiStream]);

  /** 处理 PDF 文件 */
  const handlePdfFile = useCallback(async (file, startIndex) => {
    try {
      const pdfImages = await pdfToImageDataUrls(file);

      setImages(prev => {
        const newImages = [...prev];
        newImages.splice(startIndex, 1, ...pdfImages);
        return newImages;
      });
      setResults(prev => {
        const newResults = [...prev];
        newResults.splice(startIndex, 1, ...new Array(pdfImages.length).fill('正在识别中...'));
        return newResults;
      });

      const batchSize = 6;
      const allResults = [];
      const signal = abortRef.current.signal;

      for (let i = 0; i < pdfImages.length; i += batchSize) {
        if (signal.aborted) break;
        try {
          const batch = pdfImages.slice(i, i + batchSize);
          const batchPromises = batch.map(async (imgDataUrl, batchIndex) => {
            const pageIndex = i + batchIndex;
            try {
              const imageFile = await dataUrlToFile(imgDataUrl, `page_${pageIndex + 1}.jpg`, 'image/jpeg');
              return handleImageFile(imageFile, startIndex + pageIndex);
            } catch (error) {
              console.error(`处理PDF第 ${pageIndex + 1} 页图片时出错:`, error);
              return `第 ${pageIndex + 1} 页处理失败: ${error.message}`;
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          allResults.push(...batchResults.map(r =>
            r.status === 'fulfilled' ? r.value : `处理失败: ${r.reason}`
          ));
        } catch (batchError) {
          console.error('处理PDF批次时出错:', batchError);
        }
      }

      return allResults.filter(Boolean).join('\n\n---\n\n');
    } catch (error) {
      console.error('PDF处理错误:', error);
      throw new Error(`PDF处理失败: ${error.message}`);
    }
  }, [handleImageFile]);

  /** 统一文件处理入口 */
  const handleFile = useCallback(async (file, index) => {
    // 记录原始文件引用，供后续「重试识别」重跑同一文件
    if (index >= 0) {
      setFiles(prev => { const next = [...prev]; next[index] = file; return next; });
    }
    try {
      let content = '';
      if (file.type === 'application/pdf') {
        content = await handlePdfFile(file, index);
      } else if (file.type.startsWith('image/')) {
        content = await handleImageFile(file, index);
      } else {
        throw new Error('不支持的文件类型');
      }

      if (index >= 0 && !file.type.startsWith('application/pdf')) {
        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = content;
          return newResults;
        });
      }
    } catch (error) {
      console.error('处理文件时出错:', error);
      // 错误进错误通道；若 handleImageFile 已记录则不覆盖（避免双写、保留更具体信息）
      if (index >= 0) {
        setErrors(prev => {
          const next = [...prev];
          if (!next[index]) next[index] = `处理失败：${error.message}`;
          return next;
        });
      }
    }
  }, [handleImageFile, handlePdfFile]);

  /** 上传多文件 */
  const uploadFiles = useCallback(async (files) => {
    setIsLoading(true);
    try {
      const startIndex = images.length;
      const validFiles = files.filter(file =>
        file.type.startsWith('image/') || file.type === 'application/pdf'
      );

      const previews = await Promise.all(validFiles.map(async file => {
        if (file.type.startsWith('image/')) return URL.createObjectURL(file);
        if (file.type === 'application/pdf') {
          return 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="#e2e8f0" d="M14 4h26l14 14v42a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"/><path fill="#cbd5e1" d="M40 4l14 14H44a4 4 0 0 1-4-4V4z"/><rect x="16" y="38" width="32" height="16" rx="2" fill="#ef4444"/><text x="32" y="50" font-family="Arial,sans-serif" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle">PDF</text></svg>'
          );
        }
        return '';
      }));

      setImages(prev => [...prev, ...previews]);
      setResults(prev => [...prev, ...new Array(validFiles.length).fill('')]);
      setCurrentIndex(startIndex);

      const signal = abortRef.current.signal;
      for (let i = 0; i < validFiles.length; i++) {
        if (signal.aborted) break;
        await handleFile(validFiles[i], startIndex + i);
      }
    } catch (error) {
      console.error('处理文件时出错:', error);
    } finally {
      setIsLoading(false);
    }
  }, [images.length, handleFile]);

  /** 处理剪贴板图片（桌面端快捷键触发） */
  const processClipboardImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return null;

    setIsLoading(true);
    try {
      const imageUrl = URL.createObjectURL(file);
      const newIndex = images.length;

      setImages(prev => [...prev, imageUrl]);
      setResults(prev => [...prev, '']);
      setCurrentIndex(newIndex);

      await handleFile(file, newIndex);
      return newIndex;
    } catch (error) {
      console.error('处理剪贴板图片出错:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [images.length, handleFile]);

  /** 纠错当前结果 */
  const correctCurrentText = useCallback(async () => {
    if (!results[currentIndex] || isCorrectingText) return;

    setIsCorrectingText(true);
    try {
      let liveText = '';
      await correctText({
        text: results[currentIndex],
        promptTemplate: resolvePrompt(correctionPromptRef.current, DEFAULT_CORRECTION_PROMPT),
        streamClient: callGeminiStream,
        onTextChunk: (chunk) => {
          liveText += chunk;
          setResults(prev => {
            const newResults = [...prev];
            newResults[currentIndex] = liveText;
            return newResults;
          });
        },
      });
    } catch (error) {
      console.error('纠错过程出错:', error);
    } finally {
      setIsCorrectingText(false);
    }
  }, [results, currentIndex, isCorrectingText, callGeminiStream]);

  /** 翻译某条识别结果（两段式翻译的第二段；失败置错误态、不污染 results） */
  const translateResult = useCallback(async (index, sourceText) => {
    const source = sourceText != null ? sourceText : results[index];
    if (!source || !source.trim()) return;

    const gen = generationRef.current;
    const stale = () => generationRef.current !== gen;
    setTranslateErrors(prev => { const next = [...prev]; next[index] = ''; return next; });
    setTranslating(prev => { const next = [...prev]; next[index] = true; return next; });
    try {
      let liveText = '';
      await translateText({
        text: source,
        lang: translateLangRef.current,
        promptTemplate: resolvePrompt(translatePromptRef.current, DEFAULT_TRANSLATE_PROMPT),
        streamClient: callGeminiStream,
        onTextChunk: (chunk) => {
          liveText += chunk;
          setTranslations(prev => { if (stale()) return prev; const next = [...prev]; next[index] = liveText; return next; });
        },
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('翻译出错:', error);
      setTranslateErrors(prev => { if (stale()) return prev; const next = [...prev]; next[index] = `翻译失败：${error.message}`; return next; });
    } finally {
      setTranslating(prev => { if (stale()) return prev; const next = [...prev]; next[index] = false; return next; });
    }
  }, [results, callGeminiStream]);
  translateResultRef.current = translateResult;

  /** 重试识别：读原始 File 重跑，第 2 次尝试起追加重试提示词 */
  const retryRecognition = useCallback(async (index) => {
    const file = files[index];
    if (!file) return;
    attemptsRef.current[index] = (attemptsRef.current[index] || 1) + 1;
    setIsLoading(true);
    try {
      await handleImageFile(file, index, attemptsRef.current[index]);
    } finally {
      setIsLoading(false);
    }
  }, [files, handleImageFile]);

  /** 清空整个会话：撤销 blob 预览 URL + 重置全部结果衍生状态 */
  const clearSession = useCallback(() => {
    generationRef.current += 1; // 递增代际，丢弃所有进行中请求的后续写回
    attemptsRef.current = [];
    // 撤销 createObjectURL 生成的 blob: 预览，避免内存泄漏（data: URL 无需撤销）
    images.forEach((url) => {
      if (typeof url === 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    cancelRecognition(); // 中止进行中的识别/纠错请求，并复位 loading 态
    setImages([]);
    setResults([]);
    setTranslations([]);
    setErrors([]);
    setTranslateErrors([]);
    setFiles([]);
    setTranslating([]);
    setCurrentIndex(0);
  }, [images, cancelRecognition]);

  // ─── 导航 ───
  const handlePrevImage = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

  const handleNextImage = useCallback(() => {
    if (currentIndex < images.length - 1) setCurrentIndex(prev => prev + 1);
  }, [currentIndex, images.length]);

  return {
    // 状态
    images, setImages,
    results, setResults,
    currentIndex, setCurrentIndex,
    isLoading, setIsLoading,
    isCorrectingText,
    translations, setTranslations,
    errors, setErrors,
    translateErrors, setTranslateErrors,
    files, setFiles,
    translating, setTranslating,
    translateEnabled, setTranslateEnabled,
    translateLang, setTranslateLang,
    apiUrlConfig, setApiUrlConfig,
    apiKeyConfig, setApiKeyConfig,
    modelConfig, setModelConfig,
    accessTokenConfig, setAccessTokenConfig,
    ocrPromptConfig, setOcrPromptConfig,
    translatePromptConfig, setTranslatePromptConfig,
    correctionPromptConfig, setCorrectionPromptConfig,
    envConfig,

    // 动作
    callGeminiStream,
    cancelRecognition,
    handleFile,
    handleImageFile,
    handlePdfFile,
    uploadFiles,
    processClipboardImage,
    correctCurrentText,
    translateResult,
    retryRecognition,
    clearSession,
    handlePrevImage,
    handleNextImage,
  };
};
