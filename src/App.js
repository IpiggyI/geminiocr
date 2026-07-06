import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { useOcrSession } from './hooks/useOcrSession';
import { isTauri, showAndFocusWindow } from './desktop/tauriBridge';
import { initDesktopShortcut } from './desktop/shortcutBootstrap';
import { clipboardImageToFile, readBrowserClipboardImage } from './desktop/clipboardImageToFile';
import { shouldHandleGlobalPasteEvent } from './desktop/pasteGuards';
import { fetchImageBlob } from './lib/files/fetchImageBlob';
import { ToastHost, toast } from './components/Toast';
import { SettingsView } from './components/settings/SettingsView';
import { UploadDropzone } from './components/UploadDropzone';
import { Toolbar } from './components/Toolbar';
import { SplitPane } from './components/SplitPane';
import { ImagePane } from './components/ImagePane';
import { ResultPane } from './components/ResultPane';
import { SettingsIcon } from './components/icons';
import { loadDesktopShortcut, saveDesktopShortcut, DEFAULT_DESKTOP_SHORTCUT } from './desktop/desktopPreferences';

function App() {
  // 视图切换 + 缺 Key 引导（识别失败带「去设置」动作时跳设置并聚焦 Key 输入框）
  const [view, setView] = useState('main'); // 'main' | 'settings'
  const apiKeyInputRef = useRef(null);
  const focusKeyInSettings = () => {
    setView('settings');
    requestAnimationFrame(() => apiKeyInputRef.current?.focus());
  };
  const ocr = useOcrSession({ onNeedApiKey: focusKeyInSettings });
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
    clearSession,
  } = ocr;
  const desktopMode = isTauri();
  const hasImages = images.length > 0;

  // UI-only state
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const processClipboardImageRef = useRef(ocr.processClipboardImage);
  const desktopShortcutHandlerRef = useRef(async () => {});
  const desktopShortcutCleanupRef = useRef(async () => {});
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
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
      const [shortcutResult] = await Promise.allSettled([
        initDesktopShortcut({
          shortcut: loadDesktopShortcut(),
          onTriggered: () => desktopShortcutHandlerRef.current(),
        }),
      ]);

      if (disposed) {
        if (shortcutResult.status === 'fulfilled') {
          await shortcutResult.value.cleanup();
        }
        return;
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 统一断点：matchMedia 监听 768px（桌面端由 isCompact 另行门控，不进紧凑）
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handleChange = (e) => setIsMobile(e.matches);

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // 修改粘贴事件处理函数
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!shouldHandleGlobalPasteEvent(e)) return;

      const items = Array.from(e.clipboardData?.items || []);
      let nextImageIndex = images.length;
      
      for (const item of items) {
        // 处理图片
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            setIsLoading(true);
            try {
              const imageUrl = URL.createObjectURL(file);
              const newIndex = nextImageIndex;
              nextImageIndex += 1;
              
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
    const files = Array.from(e.target.files);
    e.target.value = ''; // 先重置，允许连续选同一文件再次触发 change
    await uploadFiles(files);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  // 「粘贴」按钮：主动读剪贴板图片（桌面走 Tauri，Web 走浏览器剪贴板 API）
  const handlePasteButton = async () => {
    if (desktopMode) {
      const result = await clipboardImageToFile();
      if (result.status === 'success') {
        await ocr.processClipboardImage(result.file);
      } else {
        toast(result.message, { type: result.status === 'error' ? 'error' : 'info' });
      }
      return;
    }

    try {
      const file = await readBrowserClipboardImage();
      if (file) {
        await ocr.processClipboardImage(file);
      } else {
        toast('剪贴板中没有图片，可截图后重试或直接按 Ctrl+V 粘贴', { type: 'info' });
      }
    } catch (error) {
      console.error('读取剪贴板失败:', error);
      toast('读取剪贴板失败，请改用 Ctrl+V 粘贴', { type: 'error' });
    }
  };

  // 「清除」按钮：清空会话 + 复位上传区 UI
  const handleClearAll = () => {
    clearSession();
    setShowUrlInput(false);
    setImageUrl('');
    setShowModal(false);
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
      // 占位/PDF 展开/索引偏移统一走 uploadFiles，拖拽不再自建占位（修混合 PDF 索引错位 + PDF 预览裂图）
      await uploadFiles(files);
    } catch (error) {
      console.error('Error processing dropped files:', error);
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

  const openSettings = () => {
    setDesktopShortcutConfig(activeDesktopShortcut);
    setDesktopShortcutError('');
    setView('settings');
  };

  // 设置视图内录制快捷键：即时注册生效，失败置错误态（不弹 toast，就地展示）
  const applyDesktopShortcut = async (nextShortcut) => {
    setDesktopShortcutConfig(nextShortcut);
    if (!desktopMode) return;

    try {
      const result = await initDesktopShortcut({
        shortcut: nextShortcut,
        onTriggered: () => desktopShortcutHandlerRef.current(),
      });

      if (result.ok) {
        desktopShortcutCleanupRef.current = result.cleanup;
        const persistedShortcut = saveDesktopShortcut(result.activeShortcut);
        setActiveDesktopShortcut(persistedShortcut);
        setDesktopShortcutConfig(persistedShortcut);
        setDesktopShortcutError('');
      } else {
        setDesktopShortcutError(result.message);
      }
    } catch (error) {
      console.error('保存桌面快捷键失败:', error);
      setDesktopShortcutError(`快捷键注册失败，请检查格式或更换组合键 (${error.message})`);
    }
  };

  // 清空并回落环境变量：API 配置 + 三条提示词 + 翻译语言/开关 + 桌面快捷键一并复位
  const resetSettings = () => {
    ocr.setApiUrlConfig('');
    ocr.setApiKeyConfig('');
    ocr.setModelConfig('');
    ocr.setAccessTokenConfig('');
    ocr.setOcrPromptConfig('');
    ocr.setTranslatePromptConfig('');
    ocr.setCorrectionPromptConfig('');
    ocr.setTranslateEnabled(false);
    ocr.setTranslateLang('中文');
    if (desktopMode) applyDesktopShortcut(DEFAULT_DESKTOP_SHORTCUT);
  };

  // 复制文本（复制反馈由 ResultPane 的本地 state 驱动，此处只负责写剪贴板）
  const handleCopyText = (text) => navigator.clipboard.writeText(text);

  // 独立设置视图：主界面状态留在 App 层，切换不卸载、返回后识别结果保留
  if (view === 'settings') {
    return (
      <div className={`app${isCompact ? ' app--compact' : ''}`}>
        <ToastHost />
        <SettingsView
          ocr={ocr}
          desktopMode={desktopMode}
          desktop={{
            shortcutConfig: desktopShortcutConfig,
            shortcutError: desktopShortcutError,
            applyShortcut: applyDesktopShortcut,
          }}
          keyInputRef={apiKeyInputRef}
          onBack={() => setView('main')}
          onReset={resetSettings}
        />
      </div>
    );
  }

  return (
    <div className={`app${isCompact ? ' app--compact' : ''}`}>
      <ToastHost />
      {!hasImages && (
        <header>
          <button
            type="button"
            className="settings-link"
            aria-label="打开设置"
            onClick={openSettings}
          >
            <SettingsIcon />
          </button>
          <h1>高精度OCR识别</h1>
          <p>
            {isCompact ? '上传图片、PDF即刻识别文字内容' : desktopMode ? (
              `全局快捷键 ${activeDesktopShortcut} 快速识别剪贴板图片，也支持拖拽、粘贴、上传`
            ) : (
              '智能识别多国语言及手写体、表格、结构化抽取、数学公式，上传或拖拽图片、pdf 即刻识别文字内容，默认使用 Gemini 原生流式接口'
            )}
          </p>
        </header>
      )}

      <input
        id="file-input"
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleImageUpload}
        multiple
        hidden
      />

      <main className={hasImages ? 'has-content' : ''}>
        {!hasImages ? (
          <UploadDropzone
            dropZoneRef={dropZoneRef}
            isDragging={isDragging}
            isCompact={isCompact}
            desktopMode={desktopMode}
            activeDesktopShortcut={activeDesktopShortcut}
            onPickFile={openFilePicker}
            onPaste={handlePasteButton}
            showUrlInput={showUrlInput}
            onToggleUrlInput={() => setShowUrlInput(!showUrlInput)}
            imageUrl={imageUrl}
            onImageUrlChange={(e) => setImageUrl(e.target.value)}
            onUrlSubmit={handleUrlSubmit}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        ) : (
          <div
            className={`workspace ${isDragging ? 'dragging' : ''}`}
            ref={dropZoneRef}
            onDragEnter={!isCompact ? handleDragEnter : undefined}
            onDragOver={!isCompact ? handleDragOver : undefined}
            onDragLeave={!isCompact ? handleDragLeave : undefined}
            onDrop={!isCompact ? handleDrop : undefined}
          >
            <Toolbar
              onPickFile={openFilePicker}
              onPaste={handlePasteButton}
              onToggleUrlInput={() => setShowUrlInput(!showUrlInput)}
              onClear={handleClearAll}
              showUrlInput={showUrlInput}
              translateEnabled={ocr.translateEnabled}
              onToggleTranslate={() => ocr.setTranslateEnabled(!ocr.translateEnabled)}
              translateLang={ocr.translateLang}
              onChangeLang={(e) => ocr.setTranslateLang(e.target.value)}
              onOpenConfig={openSettings}
              imageUrl={imageUrl}
              onImageUrlChange={(e) => setImageUrl(e.target.value)}
              onUrlSubmit={handleUrlSubmit}
            />
            <SplitPane disabled={isCompact}>
              <ImagePane
                images={images}
                currentIndex={currentIndex}
                isLoading={isLoading}
                onSelect={setCurrentIndex}
                onImageClick={handleImageClick}
              />
              <ResultPane
                results={results}
                translations={ocr.translations}
                errors={ocr.errors}
                translateErrors={ocr.translateErrors}
                translating={ocr.translating}
                currentIndex={currentIndex}
                isLoading={isLoading}
                isCorrectingText={isCorrectingText}
                onCancel={cancelRecognition}
                onCopy={handleCopyText}
                onCorrect={handleCorrectText}
                onRetry={ocr.retryRecognition}
                onRetryTranslate={ocr.translateResult}
              />
            </SplitPane>
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

    </div>
  );
}

export default App;
