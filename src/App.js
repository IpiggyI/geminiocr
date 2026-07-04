import React, { useState, useRef, useEffect } from 'react';
import { Viewer } from '@bytemd/react';
import mathPlugin from '@bytemd/plugin-math';
import gfmPlugin from '@bytemd/plugin-gfm';
import highlightPlugin from '@bytemd/plugin-highlight';
import breaksPlugin from '@bytemd/plugin-breaks';
import frontmatterPlugin from '@bytemd/plugin-frontmatter';
import 'bytemd/dist/index.css';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import './App.css';
import { useOcrSession } from './hooks/useOcrSession';
import { isTauri, showAndFocusWindow } from './desktop/tauriBridge';
import { initDesktopShortcut } from './desktop/shortcutBootstrap';
import { clipboardImageToFile } from './desktop/clipboardImageToFile';
import { initDesktopWindowBehavior } from './desktop/windowBootstrap';
import { shouldHandleGlobalPasteEvent } from './desktop/pasteGuards';
import { fetchImageBlob } from './lib/files/fetchImageBlob';
import { ToastHost, toast } from './components/Toast';
import { ConfigModal } from './components/ConfigModal';
import { loadDesktopShortcut, saveDesktopShortcut } from './desktop/desktopPreferences';

// 配置 ByteMD 插件
const plugins = [
  mathPlugin({
    katexOptions: {
      throwOnError: false,
      output: 'html',
      strict: false,
      macros: {
        '\\f': '#1f(#2)',
      },
    }
  }),
  gfmPlugin(),
  highlightPlugin(),
  breaksPlugin(),
  frontmatterPlugin()
];

function App() {
  const ocr = useOcrSession();
  const {
    images, setImages,
    results, setResults,
    currentIndex, setCurrentIndex,
    isLoading, setIsLoading,
    isCorrectingText,
    handleFile,
    uploadFiles,
    cancelRecognition,
    correctCurrentText: handleCorrectText,
    handlePrevImage,
    handleNextImage,
  } = ocr;
  const desktopMode = isTauri();

  // UI-only state
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const resultRef = useRef(null);
  const dropZoneRef = useRef(null);
  const processClipboardImageRef = useRef(ocr.processClipboardImage);
  const desktopShortcutHandlerRef = useRef(async () => {});
  const desktopShortcutCleanupRef = useRef(async () => {});
  const desktopWindowCleanupRef = useRef(async () => {});
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  // 桌面窗口可任意缩放，不进入移动端降级布局
  const isCompact = isMobile && !desktopMode;
  const [desktopShortcutConfig, setDesktopShortcutConfig] = useState(() => loadDesktopShortcut());
  const [activeDesktopShortcut, setActiveDesktopShortcut] = useState(() => loadDesktopShortcut());
  const [desktopShortcutError, setDesktopShortcutError] = useState('');

  processClipboardImageRef.current = ocr.processClipboardImage;
  desktopShortcutHandlerRef.current = async () => {
    const result = await clipboardImageToFile();
    await showAndFocusWindow();

    if (result.status === 'success') {
      await processClipboardImageRef.current(result.file);
      return;
    }

    toast(result.message, { type: result.status === 'error' ? 'error' : 'info' });
  };

  // 桌面端：全局快捷键 → 剪贴板图片 → 自动 OCR
  useEffect(() => {
    if (!desktopMode) return;

    let disposed = false;

    const bootstrapDesktop = async () => {
      const [windowResult, shortcutResult] = await Promise.allSettled([
        initDesktopWindowBehavior(),
        initDesktopShortcut({
          shortcut: loadDesktopShortcut(),
          onTriggered: () => desktopShortcutHandlerRef.current(),
        }),
      ]);

      if (disposed) {
        if (windowResult.status === 'fulfilled') {
          await windowResult.value();
        }
        if (shortcutResult.status === 'fulfilled') {
          await shortcutResult.value.cleanup();
        }
        return;
      }

      if (windowResult.status === 'fulfilled') {
        desktopWindowCleanupRef.current = windowResult.value;
      } else {
        console.error('初始化桌面窗口行为失败:', windowResult.reason);
      }

      if (shortcutResult.status === 'fulfilled') {
        const result = shortcutResult.value;
        desktopShortcutCleanupRef.current = result.cleanup;

        if (result.ok) {
          const persistedShortcut = saveDesktopShortcut(result.activeShortcut);
          setActiveDesktopShortcut(persistedShortcut);
          setDesktopShortcutConfig(persistedShortcut);
          setDesktopShortcutError('');
          return;
        }

        setActiveDesktopShortcut(result.activeShortcut);
        setDesktopShortcutConfig(result.activeShortcut);
        setDesktopShortcutError(result.message);
        return;
      }

      const errorMessage = `快捷键初始化失败，请检查格式或更换组合键 (${shortcutResult.reason?.message || 'unknown error'})`;
      console.error('初始化桌面快捷键失败:', shortcutResult.reason);
      setDesktopShortcutError(errorMessage);
    };

    void bootstrapDesktop();

    return () => {
      disposed = true;
      void desktopShortcutCleanupRef.current();
      void desktopWindowCleanupRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 添加检测移动设备的 useEffect
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 修改粘贴事件处理函数
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!shouldHandleGlobalPasteEvent(e)) return;

      const items = Array.from(e.clipboardData?.items || []);
      
      for (const item of items) {
        // 处理图片
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            setIsLoading(true);
            try {
              const imageUrl = URL.createObjectURL(file);
              const newIndex = images.length;
              
              setImages(prev => [...prev, imageUrl]);
              setResults(prev => [...prev, '']);
              setCurrentIndex(newIndex);
              
              await handleFile(file, newIndex);
            } catch (error) {
              console.error('Error processing pasted image:', error);
            } finally {
              setIsLoading(false);
            }
          }
        }
        // 处理文本（可能是链接）
        else if (item.type === 'text/plain') {
          item.getAsString(async (text) => {
            // 如果文本包含 http 或 https，就认为是链接
            if (text.match(/https?:\/\//i)) {
              setImageUrl(text);
              setShowUrlInput(true);
            }
          });
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
    // handleFile 每次渲染会重新创建，这里仅需基于图片数量重绑监听。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  // 文件上传处理 — 委托给 useOcrSession
  const handleImageUpload = async (e) => {
    await uploadFiles(Array.from(e.target.files));
  };

  // 添加全局拖拽事件监听
  useEffect(() => {
    const handleGlobalDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDraggingGlobal) {
        setIsDraggingGlobal(true);
        setIsDragging(true);
      }
    };

    const handleGlobalDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = document.body.getBoundingClientRect();
      if (
        e.clientX <= rect.left ||
        e.clientX >= rect.right ||
        e.clientY <= rect.top ||
        e.clientY >= rect.bottom
      ) {
        setIsDraggingGlobal(false);
        setIsDragging(false);
      }
    };

    const handleGlobalDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingGlobal(false);
      setIsDragging(false);
    };

    const handleGlobalDragOver = (e) => e.preventDefault();

    window.addEventListener('dragenter', handleGlobalDragEnter);
    window.addEventListener('dragleave', handleGlobalDragLeave);
    window.addEventListener('drop', handleGlobalDrop);
    window.addEventListener('dragover', handleGlobalDragOver);

    return () => {
      window.removeEventListener('dragenter', handleGlobalDragEnter);
      window.removeEventListener('dragleave', handleGlobalDragLeave);
      window.removeEventListener('drop', handleGlobalDrop);
      window.removeEventListener('dragover', handleGlobalDragOver);
    };
  }, [isDraggingGlobal]);

  // 修改原有的拖拽处理函数
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = dropZoneRef.current.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsDraggingGlobal(false);
    setIsLoading(true);
    
    try {
      const items = Array.from(e.dataTransfer.items);
      const filePromises = items.map(async (item) => {
        if (item.kind === 'string') {
          const url = await new Promise(resolve => item.getAsString(resolve));
          if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            const blob = await fetchImageBlob(url);
            return new File([blob], 'image.jpg', { type: blob.type });
          }
        } else if (item.kind === 'file') {
          return item.getAsFile();
        }
        return null;
      });

      const files = (await Promise.all(filePromises)).filter(file => file !== null);
      const startIndex = images.length;
      
      const imageUrls = files.map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...imageUrls]);
      setResults(prev => [...prev, ...new Array(files.length).fill('')]);
      setCurrentIndex(startIndex);

      // 逐批处理（最多 5 个并发）
      const maxConcurrent = 5;
      for (let i = 0; i < files.length; i += maxConcurrent) {
        const batch = files.slice(i, i + maxConcurrent);
        await Promise.all(batch.map((file, idx) => handleFile(file, startIndex + i + idx)));
      }
    } catch (error) {
      console.error('Error processing dropped files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 修改处理图片 URL 的函数
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!imageUrl) return;
    setIsLoading(true);
    
    try {
      let imageBlob = await fetchImageBlob(imageUrl);

      // 确保获取到的是图片
      if (!imageBlob.type.startsWith('image/')) {
        // 如果 MIME 类型不是图片，尝试强制设置为图片
        imageBlob = new Blob([imageBlob], { type: 'image/jpeg' });
      }
      
      const file = new File([imageBlob], 'image.jpg', { type: imageBlob.type });
      const imageUrlObject = URL.createObjectURL(file);
      
      // 验证图片是否可用
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrlObject;
      });
      
      const newIndex = images.length;
      setImages(prev => [...prev, imageUrlObject]);
      setResults(prev => [...prev, '']);
      setCurrentIndex(newIndex);
      
      await handleFile(file, newIndex);
      
      setShowUrlInput(false);
      setImageUrl('');
    } catch (error) {
      console.error('Error loading image:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '无法加载图片，';
      if (error.message.includes('CORS')) {
        errorMessage += '该图片可能有访问限制。';
      } else if (error.message.includes('network')) {
        errorMessage += '网络连接出现问题。';
      } else {
        errorMessage += '请检查链接是否正确。';
      }
      errorMessage += '\n您可以尝试：\n1. 右键图片另存为后上传\n2. 使用截图工具后粘贴\n3. 复制图片本身而不是链接';

      toast(errorMessage, { type: 'error', duration: 8000 });
    } finally {
      setIsLoading(false);
    }
  };

  // 添加处理图片点击的函数
  const handleImageClick = () => {
    setShowModal(true);
  };

  // 添加关闭模态框的函数
  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleCloseConfigModal = () => {
    setDesktopShortcutConfig(activeDesktopShortcut);
    setDesktopShortcutError('');
    setShowConfigModal(false);
  };

  const openConfigModal = () => {
    setDesktopShortcutConfig(activeDesktopShortcut);
    setDesktopShortcutError('');
    setShowConfigModal(true);
  };

  const handleSaveConfigModal = async () => {
    let shortcutErrorMessage = '';

    if (desktopMode) {
      try {
        const result = await initDesktopShortcut({
          shortcut: desktopShortcutConfig,
          onTriggered: () => desktopShortcutHandlerRef.current(),
        });

        if (result.ok) {
          desktopShortcutCleanupRef.current = result.cleanup;
          const persistedShortcut = saveDesktopShortcut(result.activeShortcut);
          setActiveDesktopShortcut(persistedShortcut);
          setDesktopShortcutConfig(persistedShortcut);
          setDesktopShortcutError('');
        } else {
          shortcutErrorMessage = result.message;
          setDesktopShortcutError(result.message);
        }
      } catch (error) {
        shortcutErrorMessage = `快捷键注册失败，请检查格式或更换组合键 (${error.message})`;
        console.error('保存桌面快捷键失败:', error);
        setDesktopShortcutError(shortcutErrorMessage);
      }
    }

    setShowConfigModal(false);

    if (shortcutErrorMessage) {
      toast(shortcutErrorMessage, { type: 'error' });
    }
  };

  // 在 App 组件中添加复制函数
  const handleCopyText = () => {
    if (results[currentIndex]) {
      navigator.clipboard.writeText(results[currentIndex])
        .then(() => {
          // 可以添加一个临时的成功提示
          const button = document.querySelector('.copy-button');
          const originalText = button.textContent;
          button.textContent = '已复制';
          button.classList.add('copied');
          
          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
          }, 2000);
        })
        .catch(err => {
          console.error('复制失败:', err);
        });
    }
  };

  return (
    <div className="app">
      <ToastHost />
      <header>
        <button
          type="button"
          className="settings-link"
          aria-label="打开 API 配置"
          onClick={openConfigModal}
          style={{ display: isCompact ? 'none' : 'flex' }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.325 4.317a1 1 0 0 1 1.35-.936l.664.286a1 1 0 0 0 .79 0l.664-.286a1 1 0 0 1 1.35.936l.081.72a1 1 0 0 0 .596.804l.663.287a1 1 0 0 1 .55 1.31l-.286.663a1 1 0 0 0 0 .79l.286.663a1 1 0 0 1-.55 1.31l-.663.287a1 1 0 0 0-.596.804l-.081.72a1 1 0 0 1-1.35.936l-.664-.286a1 1 0 0 0-.79 0l-.664.286a1 1 0 0 1-1.35-.936l-.081-.72a1 1 0 0 0-.596-.804l-.663-.287a1 1 0 0 1-.55-1.31l.286-.663a1 1 0 0 0 0-.79l-.286-.663a1 1 0 0 1 .55-1.31l.663-.287a1 1 0 0 0 .596-.804l.081-.72z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <a 
          href="https://github.com/CiZaii" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="github-link"
          style={{ display: isCompact ? 'none' : 'block' }}
        >
          <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32">
            <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
        </a>
        <h1>高精度OCR识别</h1>
        <p>
          {isCompact ? '上传图片、PDF即刻识别文字内容' : desktopMode ? (
            `全局快捷键 ${activeDesktopShortcut} 快速识别剪贴板图片，也支持拖拽、粘贴、上传`
          ) : (
            '智能识别多国语言及手写体、表格、结构化抽取、数学公式，上传或拖拽图片、pdf 即刻识别文字内容，默认使用 Gemini 原生流式接口'
          )}
        </p>
      </header>

      <main className={images.length > 0 ? 'has-content' : ''}>
        <div className={`upload-section ${images.length > 0 ? 'with-image' : ''}`}>
          <div
            ref={dropZoneRef}
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={!isCompact ? handleDragEnter : undefined}
            onDragOver={!isCompact ? handleDragOver : undefined}
            onDragLeave={!isCompact ? handleDragLeave : undefined}
            onDrop={!isCompact ? handleDrop : undefined}
          >
            <div className="upload-container">
              <label className="upload-button" htmlFor="file-input">
                {images.length > 0 ? '重新上传' : '上传文件'}
              </label>
              <p className="supported-types">
                {desktopMode
                  ? `支持的格式：PNG、JPG、PDF | 快捷键：${activeDesktopShortcut}`
                  : '支持的格式：PNG、JPG、PDF'}
              </p>
              <input
                id="file-input"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleImageUpload}
                multiple
                hidden
              />
              {!isCompact && (
                <button
                  className="url-button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                >
                  {showUrlInput ? '取消' : '使用链接'}
                </button>
              )}
            </div>
            
            {showUrlInput && !isCompact && (
              <form onSubmit={handleUrlSubmit} className="url-form">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="请输入图片链接"
                  className="url-input"
                />
                <button type="submit" className="url-submit">
                  确认
                </button>
              </form>
            )}
            
            {!images.length > 0 && !showUrlInput && !isCompact && (
              <p className="upload-hint">或将图片拖放到此处</p>
            )}
          </div>
          
          {images.length > 0 && (
            <div className="images-preview">
              <div className="image-navigation">
                <button 
                  onClick={handlePrevImage} 
                  disabled={currentIndex === 0}
                  className="nav-button"
                >
                  ←
                </button>
                <span className="image-counter">
                  {currentIndex + 1} / {images.length}
                </span>
                <button 
                  onClick={handleNextImage}
                  disabled={currentIndex === images.length - 1}
                  className="nav-button"
                >
                  →
                </button>
              </div>
              <div className={`image-preview ${isLoading ? 'loading' : ''}`}>
                <img 
                  src={images[currentIndex]} 
                  alt="预览" 
                  onClick={handleImageClick}
                  style={{ cursor: 'pointer' }}
                />
                {isLoading && <div className="loading-overlay" />}
              </div>
            </div>
          )}
        </div>

        {(results.length > 0 || isLoading) && (
          <div className="result-section">
            <div className="result-container" ref={resultRef}>
              {isLoading && (
                <div className="loading">
                  识别中...
                  <button className="cancel-button" onClick={cancelRecognition}>
                    取消
                  </button>
                </div>
              )}
              {results[currentIndex] && (
                <div className="result-text">
                  <div className="result-header">
                    <span>第 {currentIndex + 1} 张图片的识别结果</span>
                    <div className="result-actions">
                      <button className="copy-button" onClick={handleCopyText}>
                        复制内容
                      </button>
                      <button
                        className="copy-button"
                        onClick={handleCorrectText}
                        disabled={isCorrectingText}
                      >
                        {isCorrectingText ? '纠错中...' : '一键纠错'}
                      </button>
                    </div>
                  </div>
                  <div className="markdown-body">
                    <Viewer 
                      value={results[currentIndex] || ''} 
                      plugins={plugins}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={images[currentIndex]} alt="放大预览" />
            <button className="modal-close" onClick={handleCloseModal}>×</button>
          </div>
        </div>
      )}

      {showConfigModal && (
        <ConfigModal
          ocr={ocr}
          desktop={{
            enabled: desktopMode,
            shortcutConfig: desktopShortcutConfig,
            setShortcutConfig: setDesktopShortcutConfig,
            shortcutError: desktopShortcutError,
            setShortcutError: setDesktopShortcutError,
          }}
          onClose={handleCloseConfigModal}
          onSave={handleSaveConfigModal}
        />
      )}
    </div>
  );
}

export default App;
