import { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_GEMINI_API_URL, DEFAULT_GEMINI_MODEL, createRuntimeConfigResolver, buildGeminiEndpoint } from '../lib/ocr/runtimeConfig';
import { streamGeminiContent } from '../lib/ocr/streamGeminiContent';
import { recognizeImage } from '../lib/ocr/recognizeImage';
import { correctText } from '../lib/ocr/correctText';
import { dataUrlToFile } from '../lib/files/dataUrlToFile';
import { pdfToImageDataUrls } from '../lib/pdf/pdfToImageDataUrls';

const API_CONFIG_STORAGE_KEYS = {
  apiUrl: 'geminiocr-api-url-config',
  apiKey: 'geminiocr-api-key-config',
  model: 'geminiocr-model-config',
};

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
 */
export const useOcrSession = () => {
  // ─── 核心状态 ───
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCorrectingText, setIsCorrectingText] = useState(false);

  // ─── 翻译配置 ───
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [translateLang, setTranslateLang] = useState('中文');
  const translateEnabledRef = useRef(false);
  const translateLangRef = useRef('中文');
  useEffect(() => { translateEnabledRef.current = translateEnabled; }, [translateEnabled]);
  useEffect(() => { translateLangRef.current = translateLang; }, [translateLang]);

  // ─── API 配置 ───
  const [apiUrlConfig, setApiUrlConfig] = useState(() => readStoredValue(API_CONFIG_STORAGE_KEYS.apiUrl));
  const [apiKeyConfig, setApiKeyConfig] = useState(() => readStoredValue(API_CONFIG_STORAGE_KEYS.apiKey));
  const [modelConfig, setModelConfig] = useState(() => readStoredValue(API_CONFIG_STORAGE_KEYS.model));

  useEffect(() => { writeStoredValue(API_CONFIG_STORAGE_KEYS.apiUrl, apiUrlConfig); }, [apiUrlConfig]);
  useEffect(() => { writeStoredValue(API_CONFIG_STORAGE_KEYS.apiKey, apiKeyConfig); }, [apiKeyConfig]);
  useEffect(() => { writeStoredValue(API_CONFIG_STORAGE_KEYS.model, modelConfig); }, [modelConfig]);

  const envConfig = {
    apiUrl: process.env.REACT_APP_GEMINI_API_URL || DEFAULT_GEMINI_API_URL,
    apiKey: process.env.REACT_APP_GEMINI_API_KEY || '',
    model: process.env.REACT_APP_GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  };

  const resolveConfig = createRuntimeConfigResolver({
    envConfig,
  });

  // ─── 流式请求客户端 ───
  const callGeminiStream = useCallback(async ({ prompt, imageData, mimeType, onTextChunk }) => {
    const { apiUrl, apiKey, model } = resolveConfig({ apiUrlConfig, apiKeyConfig, modelConfig });
    const endpoint = buildGeminiEndpoint(apiUrl, model, apiKey);
    return streamGeminiContent({ endpoint, prompt, imageData, mimeType, onTextChunk });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrlConfig, apiKeyConfig, modelConfig]);

  // ─── 核心动作 ───

  /** 处理单张图片识别 */
  const handleImageFile = useCallback(async (file, index) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      let liveText = '';
      const fullText = await recognizeImage({
        file,
        translateLang: translateEnabledRef.current ? translateLangRef.current : '',
        streamClient: callGeminiStream,
        onTextChunk: (chunk) => {
          liveText += chunk;
          setResults(prev => {
            const newResults = [...prev];
            newResults[index] = liveText;
            return newResults;
          });
        },
      });

      setResults(prev => {
        const newResults = [...prev];
        newResults[index] = fullText;
        return newResults;
      });
      return fullText;
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage = `识别出错,请重试 (${error.message})`;
      setResults(prev => {
        const newResults = [...prev];
        newResults[index] = errorMessage;
        return newResults;
      });
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

      for (let i = 0; i < pdfImages.length; i += batchSize) {
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
      if (index >= 0) {
        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = `处理出错: ${error.message}`;
          return newResults;
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
        if (file.type === 'application/pdf') return '/pdf-icon.png';
        return '';
      }));

      setImages(prev => [...prev, ...previews]);
      setResults(prev => [...prev, ...new Array(validFiles.length).fill('')]);
      setCurrentIndex(startIndex);

      for (let i = 0; i < validFiles.length; i++) {
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
    translateEnabled, setTranslateEnabled,
    translateLang, setTranslateLang,
    apiUrlConfig, setApiUrlConfig,
    apiKeyConfig, setApiKeyConfig,
    modelConfig, setModelConfig,
    envConfig,

    // 动作
    callGeminiStream,
    handleFile,
    handleImageFile,
    handlePdfFile,
    uploadFiles,
    processClipboardImage,
    correctCurrentText,
    handlePrevImage,
    handleNextImage,
  };
};
