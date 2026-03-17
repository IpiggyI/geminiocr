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

// 配置 ByteMD 插件
const plugins = [
  mathPlugin({
    katexOptions: {
      throwOnError: false,
      output: 'html',
      strict: false,
      trust: true,
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

const TRANSLATE_LANGUAGES = ['中文', '英语', '日语', '韩语', '法语', '德语', '西班牙语', '俄语'];




function App() {
  const ocr = useOcrSession();
  const {
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
    callGeminiStream,
    handleFile,
    handleImageFile,
    handlePdfFile,
    uploadFiles,
    correctCurrentText: handleCorrectText,
    handlePrevImage,
    handleNextImage,
  } = ocr;

  // UI-only state
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const resultRef = useRef(null);
  const dropZoneRef = useRef(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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
      e.preventDefault();
      const items = Array.from(e.clipboardData.items);
      
      for (const item of items) {
        // 处理图片
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
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

    window.addEventListener('dragenter', handleGlobalDragEnter);
    window.addEventListener('dragleave', handleGlobalDragLeave);
    window.addEventListener('drop', handleGlobalDrop);
    window.addEventListener('dragover', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('dragenter', handleGlobalDragEnter);
      window.removeEventListener('dragleave', handleGlobalDragLeave);
      window.removeEventListener('drop', handleGlobalDrop);
      window.removeEventListener('dragover', (e) => e.preventDefault());
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
            const response = await fetch(url);
            const blob = await response.blob();
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
      let imageBlob;
      
      // 处理 base64 图片
      if (imageUrl.startsWith('data:image/')) {
        const base64Data = imageUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArrays.push(byteCharacters.charCodeAt(i));
        }
        
        imageBlob = new Blob([new Uint8Array(byteArrays)], { type: 'image/png' });
      } else {
        // 使用多个代理服务，如果一个失败就尝试下一个
        const proxyServices = [
          (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
          (url) => `https://cors-anywhere.herokuapp.com/${url}`,
          (url) => `https://proxy.cors.sh/${url}`,
          (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
        ];

        let error;
        for (const getProxyUrl of proxyServices) {
          try {
            const proxyUrl = getProxyUrl(imageUrl);
            const response = await fetch(proxyUrl, {
              headers: {
                'x-requested-with': 'XMLHttpRequest',
                'origin': window.location.origin
              }
            });
            
            if (!response.ok) throw new Error('Proxy fetch failed');
            imageBlob = await response.blob();
            // 如果成功获取图片，跳出循环
            break;
          } catch (e) {
            error = e;
            // 如果当前代理失败，继续尝试下一个
            continue;
          }
        }

        // 如果所有代理都失败了，尝试直接获取
        if (!imageBlob) {
          try {
            const response = await fetch(imageUrl, {
              mode: 'no-cors'
            });
            imageBlob = await response.blob();
          } catch (e) {
            // 如果直接获取也失败，抛出最后的错误
            throw error || e;
          }
        }
      }
      
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
      
      alert(errorMessage);
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
    setShowConfigModal(false);
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
      <header>
        <button
          type="button"
          className="settings-link"
          aria-label="打开 API 配置"
          onClick={() => setShowConfigModal(true)}
          style={{ display: isMobile ? 'none' : 'flex' }}
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
          style={{ display: isMobile ? 'none' : 'block' }}
        >
          <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32">
            <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
        </a>
        <h1>高精度OCR识别</h1>
        <p>
          {isMobile ? '上传图片、PDF即刻识别文字内容' : (
            '智能识别多国语言及手写体、表格、结构化抽取、数学公式，上传或拖拽图片、pdf 即刻识别文字内容，默认使用 Gemini 原生流式接口'
          )}
        </p>
      </header>

      <main className={images.length > 0 ? 'has-content' : ''}>
        <div className={`upload-section ${images.length > 0 ? 'with-image' : ''}`}>
          <div
            ref={dropZoneRef}
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={!isMobile ? handleDragEnter : undefined}
            onDragOver={!isMobile ? handleDragOver : undefined}
            onDragLeave={!isMobile ? handleDragLeave : undefined}
            onDrop={!isMobile ? handleDrop : undefined}
          >
            <div className="upload-container">
              <label className="upload-button" htmlFor="file-input">
                {images.length > 0 ? '重新上传' : '上传文件'}
              </label>
              <p className="supported-types">
                支持的格式：PNG、JPG、PDF
              </p>
              <input
                id="file-input"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleImageUpload}
                multiple
                hidden
              />
              {!isMobile && (
                <button 
                  className="url-button" 
                  onClick={() => setShowUrlInput(!showUrlInput)}
                >
                  {showUrlInput ? '取消' : '使用链接'}
                </button>
              )}
            </div>
            
            {showUrlInput && !isMobile && (
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
            
            {!images.length > 0 && !showUrlInput && !isMobile && (
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
              {isLoading && <div className="loading">识别中...</div>}
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
        <div className="config-modal-overlay" onClick={handleCloseConfigModal}>
          <div className="modal-content config-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseConfigModal} aria-label="关闭">×</button>

            {/* Step 4: 渐变标题 + 齿轮图标 */}
            <h2 className="config-modal-title">
              <svg className="config-title-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0071e3"/>
                    <stop offset="100%" stopColor="#6200ff"/>
                  </linearGradient>
                </defs>
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="url(#gearGrad)" strokeWidth="1.5"/>
                <path d="M13.765 2.152C13.398 2 12.932 2 12 2c-.932 0-1.398 0-1.765.152a2 2 0 0 0-1.083 1.083c-.092.223-.129.484-.143.863a1.617 1.617 0 0 1-.79 1.353 1.617 1.617 0 0 1-1.567.008c-.336-.178-.579-.276-.82-.308a2 2 0 0 0-1.478.396C4.04 5.79 3.806 6.206 3.34 7.04c-.466.834-.7 1.25-.709 1.636a2 2 0 0 0 .396 1.278c.143.19.356.363.658.614.527.437.79.655.916.93a1.617 1.617 0 0 1 0 1.004c-.127.275-.39.493-.916.93-.302.25-.515.423-.658.614a2 2 0 0 0-.396 1.278c.01.387.243.803.709 1.636.466.834.7 1.25 1.014 1.493a2 2 0 0 0 1.479.396c.24-.032.483-.13.819-.308a1.617 1.617 0 0 1 1.567.008c.483.28.77.795.79 1.353.014.38.051.64.143.863a2 2 0 0 0 1.083 1.083C10.602 22 11.068 22 12 22c.932 0 1.398 0 1.765-.152a2 2 0 0 0 1.083-1.083c.092-.223.129-.484.143-.863.02-.558.307-1.074.79-1.353a1.617 1.617 0 0 1 1.567-.008c.336.178.579.276.819.308a2 2 0 0 0 1.479-.396c.314-.244.548-.66 1.014-1.493.466-.834.7-1.25.709-1.636a2 2 0 0 0-.396-1.278c-.143-.19-.356-.363-.658-.614-.527-.437-.79-.655-.916-.93a1.617 1.617 0 0 1 0-1.004c.127-.275.39-.493.916-.93.302-.25.515-.423.658-.614a2 2 0 0 0 .396-1.278c-.01-.387-.243-.803-.709-1.636-.466-.834-.7-1.25-1.014-1.493a2 2 0 0 0-1.479-.396c-.24.032-.483.13-.819.308a1.617 1.617 0 0 1-1.567-.008 1.617 1.617 0 0 1-.79-1.353c-.014-.38-.051-.64-.143-.863a2 2 0 0 0-1.083-1.083Z" stroke="url(#gearGrad)" strokeWidth="1.5"/>
              </svg>
              Gemini API 配置
            </h2>
            <p className="config-modal-subtitle">页面填写优先生效；留空时自动回落到环境变量。</p>

            {/* Step 5: 卡片式字段 + 状态 Badge */}
            <div className="api-config-grid">
              {/* API URL 字段 */}
              <label className={`config-field${apiUrlConfig ? ' config-field--custom' : ''}`}>
                <div className="config-field-header">
                  <div className="config-field-header-left">
                    <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><path d="M6.5 10.5L4.5 12.5a2.121 2.121 0 1 1-3-3l2-2M9.5 5.5l2-2a2.121 2.121 0 1 1 3 3l-2 2M5.5 10.5l5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    <span className="config-field-label">API URL</span>
                  </div>
                  <span className={`config-field-badge ${apiUrlConfig ? 'config-field-badge--custom' : 'config-field-badge--env'}`}>
                    {apiUrlConfig ? '自定义' : '环境变量'}
                  </span>
                </div>
                <input
                  type="url"
                  value={apiUrlConfig}
                  onChange={(e) => setApiUrlConfig(e.target.value)}
                  placeholder={envGeminiApiUrl || 'https://generativelanguage.googleapis.com/v1beta'}
                  className="api-config-input"
                />
              </label>

              {/* API Key 字段 */}
              <label className={`config-field${apiKeyConfig ? ' config-field--custom' : ''}`}>
                <div className="config-field-header">
                  <div className="config-field-header-left">
                    <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><path d="M10 6a2.5 2.5 0 1 0-1.586 2.329L10 10h1.5v1.5H13V10h1V8.5h-4.586A2.49 2.49 0 0 0 10 6Zm-2.5 1a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" fill="currentColor"/></svg>
                    <span className="config-field-label">API Key</span>
                  </div>
                  <span className={`config-field-badge ${apiKeyConfig ? 'config-field-badge--custom' : 'config-field-badge--env'}`}>
                    {apiKeyConfig ? '自定义' : '环境变量'}
                  </span>
                </div>
                <input
                  type="password"
                  value={apiKeyConfig}
                  onChange={(e) => setApiKeyConfig(e.target.value)}
                  placeholder="Gemini API Key"
                  className="api-config-input"
                  autoComplete="off"
                />
              </label>

              {/* Model 字段 */}
              <label className={`config-field${modelConfig ? ' config-field--custom' : ''}`}>
                <div className="config-field-header">
                  <div className="config-field-header-left">
                    <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="5" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="11" cy="8" r="1" fill="currentColor"/></svg>
                    <span className="config-field-label">Model</span>
                  </div>
                  <span className={`config-field-badge ${modelConfig ? 'config-field-badge--custom' : 'config-field-badge--env'}`}>
                    {modelConfig ? '自定义' : '环境变量'}
                  </span>
                </div>
                <input
                  type="text"
                  value={modelConfig}
                  onChange={(e) => setModelConfig(e.target.value)}
                  placeholder={envGeminiModel || 'gemini-2.5-flash'}
                  className="api-config-input"
                />
              </label>
            </div>

            {/* 翻译设置 */}
            <label className="config-field" style={{ marginTop: '12px' }}>
              <div className="config-field-header">
                <div className="config-field-header-left">
                  <svg className="config-field-icon" viewBox="0 0 16 16" fill="none"><path d="M2 3h5M4.5 3v8M7 5c0 3-2.5 6-5 6M3 8c1.5 1.5 4 2 5.5 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 14l2.5-7L14 14M9.8 12h4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="config-field-label">识别后自动翻译</span>
                </div>
                <input
                  type="checkbox"
                  checked={translateEnabled}
                  onChange={(e) => setTranslateEnabled(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
              {translateEnabled && (
                <>
                  <input
                    type="text"
                    list="translate-lang-list"
                    value={translateLang}
                    onChange={(e) => setTranslateLang(e.target.value)}
                    placeholder="输入或选择目标语言"
                    className="api-config-input"
                  />
                  <datalist id="translate-lang-list">
                    {TRANSLATE_LANGUAGES.map(lang => (
                      <option key={lang} value={lang} />
                    ))}
                  </datalist>
                </>
              )}
            </label>

            {/* Step 6: 环境默认值 — 结构化信息卡片 */}
            <div className="api-config-hint">
              <div className="api-config-hint-header">
                <svg className="api-config-hint-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 7v4M8 5.5v.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                环境变量默认值
              </div>
              <div className="api-config-hint-items">
                <div className="api-config-hint-item">
                  <span className="api-config-hint-item-label">URL</span>
                  <span className="api-config-hint-item-value" title={envGeminiApiUrl}>{envGeminiApiUrl || '未设置'}</span>
                </div>
                <div className="api-config-hint-item">
                  <span className="api-config-hint-item-label">Model</span>
                  <span className="api-config-hint-item-value" title={envGeminiModel}>{envGeminiModel || '未设置'}</span>
                </div>
              </div>
            </div>

            <div className="config-modal-actions">
              <button
                type="button"
                className="config-clear-button"
                onClick={() => {
                  setApiUrlConfig('');
                  setApiKeyConfig('');
                  setModelConfig('');
                  setTranslateEnabled(false);
                  setTranslateLang('中文');
                }}
              >
                清空并回落环境变量
              </button>
              <button
                type="button"
                className="config-save-button"
                onClick={handleCloseConfigModal}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
