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
import { pdfjs } from 'react-pdf';

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

const DEFAULT_GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// 添加 generationConfig 配置
const generationConfig = {
  temperature: 0,  // 降低随机性
  topP: 1,
  topK: 1,
  maxOutputTokens: 8192,
};

const OCR_PROMPT = `
请识别图片中的文字内容，注意以下要求：

1. 数学公式规范：
   - 独立的数学公式使用 $$，不要添加额外的换行符
   - 行内数学公式使用 $，与文字之间需要空格
   - 保持原文中的变量名称不变

2. 格式要求：
   - 每个独立公式单独成行
   - 公式与公式之间要有换行分隔
   - 公式与文字之间要有空格分隔
   - 保持原文的段落结构

3. 示例格式：
   这是一个行内公式 $x^2$ 的例子

   这是一个独立公式：
   $$f(x) = x^2 + 1$$

   这是下一段文字...

4. 特别注意：
   - 不要省略任何公式或文字
   - 保持原文的排版结构
   - 确保公式之间有正确的分隔
   - 序号和公式之间要有空格

5. 如果图片中存在类似"表格"的内容，请使用标准 Markdown 表格语法输出。例如：
   | DESCRIPTION    | RATE    | HOURS | AMOUNT   |
   |---------------|---------|-------|----------|
   | Copy Writing  | $50/hr  | 4     | $200.00  |
   | Website Design| $50/hr  | 2     | $100.00  |   
  5.1表头与单元格之间需使用"|-"分隔行，并保证每列至少有三个"-"进行对齐
  5.2 金额部分需包含货币符号以及小数点
  5.3 若识别到表格，也不能忽略表格外的文字
  5.4 以上要求须综合运用，完整输出图片中全部文本信息
请按照以上规范输出识别结果。
`;

// 修改预处理函数
const preprocessText = (text) => {
  if (!text) return '';
  
  // 临时保存表格内容
  const tables = [];
  text = text.replace(/(\|[^\n]+\|\n\|[-|\s]+\|\n\|[^\n]+\|(\n|$))+/g, (match) => {
    tables.push(match);
    return `__TABLE_${tables.length - 1}__`;
  });
  
  // 标准化数学公式分隔符
  text = text.replace(/\\\\\(/g, '$');
  text = text.replace(/\\\\\)/g, '$');
  text = text.replace(/\\\\\[/g, '$$');
  text = text.replace(/\\\\\]/g, '$$');
  
  // 移除所有的 ``` 标记
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    const content = match.slice(3, -3).trim();
    return content;
  });
  
  // 移除单独的 ``` 标记和语言标识
  text = text.replace(/```\w*\n?/g, '');
  
  // 处理数字序号后的换行问题
  text = text.replace(/(\d+)\.\s*\n+/g, '$1. ');
  
  // 处理块级公式的格式
  text = text.replace(/\n*\$\$\s*([\s\S]*?)\s*\$\$\n*/g, (match, formula) => {
    return `\n\n$$${formula.trim()}$$\n\n`;
  });
  
  // 处理行内公式的格式
  text = text.replace(/\$\s*(.*?)\s*\$/g, (match, formula) => {
    return `$${formula.trim()}$`;
  });
  
  // 处理数字序号和公式之间的格式
  text = text.replace(/(\d+\.)\s*(\$\$[\s\S]*?\$\$)/g, '$1\n\n$2');
  
  // 处理多余的空行
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // 还原表格内容
  text = text.replace(/__TABLE_(\d+)__/g, (match, index) => {
    return tables[parseInt(index)];
  });
  
  return text.trim();
};

// 添加纠错提示模板
const CORRECTION_PROMPT = `请检查并纠正以下数学公式和文本内容中的错误，特别注意：
1. LaTeX 公式语法
2. 数学符号的正确性
3. 格式排版的规范性
5. 不要添加任何解释，直接输出修正后的内容
6. 修正之后的数据一定是要可以正确解析的

以下是需要检查的内容：
{content}
`;

function App() {
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const resultRef = useRef(null);
  const dropZoneRef = useRef(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiUrlConfig, setApiUrlConfig] = useState('');
  const [apiKeyConfig, setApiKeyConfig] = useState('');
  const [modelConfig, setModelConfig] = useState('');
  const [isCorrectingText, setIsCorrectingText] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const envGeminiApiUrl = process.env.REACT_APP_GEMINI_API_URL || DEFAULT_GEMINI_API_URL;
  const envGeminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
  const envGeminiModel = process.env.REACT_APP_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const getGeminiRuntimeConfig = () => {
    const apiUrl = apiUrlConfig.trim() || envGeminiApiUrl;
    const apiKey = apiKeyConfig.trim() || envGeminiApiKey;
    const model = (modelConfig.trim() || envGeminiModel).replace(/^models\//, '');

    if (!apiKey) {
      throw new Error('缺少 Gemini API Key，请在页面配置或环境变量 REACT_APP_GEMINI_API_KEY 中设置');
    }

    return { apiUrl, apiKey, model };
  };

  const buildGeminiEndpoint = (apiUrl, model, apiKey) => {
    const normalizedUrl = apiUrl.replace(/\/+$/, '');

    if (normalizedUrl.includes(':streamGenerateContent')) {
      const hasQuery = normalizedUrl.includes('?');
      const withAlt = /[?&]alt=/.test(normalizedUrl)
        ? normalizedUrl
        : `${normalizedUrl}${hasQuery ? '&' : '?'}alt=sse`;
      return /[?&]key=/.test(withAlt)
        ? withAlt
        : `${withAlt}&key=${encodeURIComponent(apiKey)}`;
    }

    return `${normalizedUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  };

  const extractGeminiChunkText = (payload) =>
    (payload.candidates || [])
      .flatMap((candidate) => candidate?.content?.parts || [])
      .map((part) => part?.text || '')
      .join('');

  const streamGeminiContent = async ({ prompt, imageData, mimeType, onTextChunk }) => {
    const { apiUrl, apiKey, model } = getGeminiRuntimeConfig();
    const endpoint = buildGeminiEndpoint(apiUrl, model, apiKey);
    const parts = [{ text: prompt }];

    if (imageData && mimeType) {
      parts.push({
        inline_data: {
          data: imageData,
          mime_type: mimeType
        }
      });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts
          }
        ],
        generationConfig
      })
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
      if (!trimmed.startsWith('data:')) {
        return;
      }
      const rawPayload = trimmed.slice(5).trim();
      if (!rawPayload || rawPayload === '[DONE]') {
        return;
      }

      try {
        const payload = JSON.parse(rawPayload);
        const chunkText = extractGeminiChunkText(payload);
        if (chunkText) {
          onTextChunk(chunkText);
        }
      } catch (error) {
        console.error('Gemini SSE 数据解析失败:', error);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(consumeLine);
    }

    if (buffer.trim()) {
      consumeLine(buffer);
    }
  };

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

  // 修改文件处理逻辑
  const handleFile = async (file, index) => {
    try {
      let content = '';
      
      // 根据文件类型选择处理方法
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
  };

  // 处理图片文件
  const handleImageFile = async (file, index) => {
    if (file && file.type.startsWith('image/')) {
      try {
        let fullText = '';

        const fileReader = new FileReader();
        const imageData = await new Promise((resolve) => {
          fileReader.onloadend = () => {
            resolve(fileReader.result);
          };
          fileReader.readAsDataURL(file);
        });

        await streamGeminiContent({
          prompt: OCR_PROMPT,
          imageData: imageData.split(',')[1],
          mimeType: file.type,
          onTextChunk: (chunkText) => {
            fullText += chunkText;
            setResults(prevResults => {
              const newResults = [...prevResults];
              newResults[index] = fullText;
              return newResults;
            });
          }
        });

        // 在设置结果之前预处理文本
        fullText = preprocessText(fullText);

        setResults(prevResults => {
          const newResults = [...prevResults];
          newResults[index] = fullText;
          return newResults;
        });
        
        return fullText;

      } catch (error) {
        console.error('Error details:', error);
        const errorMessage = `识别出错,请重试 (${error.message})`;

        setResults(prevResults => {
          const newResults = [...prevResults];
          newResults[index] = errorMessage;
          return newResults;
        });
        
        throw error;
      }
    }
  };

  // 修改PDF文件处理函数
  const handlePdfFile = async (file, startIndex) => {
    try {
      // 加载 PDF.js worker
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      
      const fileReader = new FileReader();
      const pdfData = await new Promise((resolve) => {
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.readAsArrayBuffer(file);
      });

      const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
      const totalPages = pdf.numPages;
      const pdfImages = [];

      // 第一步：先将所有PDF页面转换为图片
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          console.log('正在转换第', pageNum, '页为图片');
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          const imageData = canvas.toDataURL('image/jpeg', 1.0);
          pdfImages.push(imageData);
        } catch (pageError) {
          console.error(`处理第 ${pageNum} 页时出错:`, pageError);
          continue; // 继续处理下一页
        }
      }

      // 更新图片预览
      setImages(prev => {
        const newImages = [...prev];
        newImages.splice(startIndex, 1, ...pdfImages);
        return newImages;
      });

      // 初始化结果数组
      setResults(prev => {
        const newResults = [...prev];
        newResults.splice(startIndex, 1, ...new Array(pdfImages.length).fill('正在识别中...'));
        return newResults;
      });

      // 使用 Promise.all 并行处理所有页面，但限制并发数
      const batchSize = 6; // 每批处理的页面数
      const results = [];
      
      for (let i = 0; i < pdfImages.length; i += batchSize) {
        try {
          const batch = pdfImages.slice(i, i + batchSize);
          const batchPromises = batch.map(async (imageData, batchIndex) => {
            const pageIndex = i + batchIndex;
            try {
              const imageBlob = await fetch(imageData).then(res => res.blob());
              const imageFile = new File([imageBlob], `page_${pageIndex + 1}.jpg`, { type: 'image/jpeg' });
              return handleImageFile(imageFile, startIndex + pageIndex);
            } catch (error) {
              console.error(`处理PDF第 ${pageIndex + 1} 页图片时出错:`, error);
              return `第 ${pageIndex + 1} 页处理失败: ${error.message}`;
            }
          });

          // 等待当前批次完成
          const batchResults = await Promise.allSettled(batchPromises);
          results.push(...batchResults.map(result => 
            result.status === 'fulfilled' ? result.value : `处理失败: ${result.reason}`
          ));
        } catch (batchError) {
          console.error('处理PDF批次时出错:', batchError);
        }
      }

      return results.filter(Boolean).join('\n\n---\n\n');
    } catch (error) {
      console.error('PDF处理错误:', error);
      throw new Error(`PDF处理失败: ${error.message}`);
    }
  };

  // 添加并发控制函数
  const concurrentProcess = async (items, processor, maxConcurrent = 5) => {
    const results = [];
    for (let i = 0; i < items.length; i += maxConcurrent) {
      const chunk = items.slice(i, i + maxConcurrent);
      const chunkPromises = chunk.map((item, index) => processor(item, i + index));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
    return results;
  };

  // 修改文件上传处理
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsLoading(true);
    
    try {
      const startIndex = images.length;
      
      // 处理所有支持的文件类型
      const validFiles = files.filter(file => 
        file.type.startsWith('image/') || file.type === 'application/pdf'
      );

      // 生成预览
      const previews = await Promise.all(validFiles.map(async file => {
        if (file.type.startsWith('image/')) {
          return URL.createObjectURL(file);
        } else if (file.type === 'application/pdf') {
          // 为PDF创建临时预览
          return '/pdf-icon.png';
        }
      }));

      setImages(prev => [...prev, ...previews]);
      setResults(prev => [...prev, ...new Array(validFiles.length).fill('')]);
      setCurrentIndex(startIndex);

      // 逐个处理文件
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        await handleFile(file, startIndex + i);
      }
    } catch (error) {
      console.error('处理文件时出错:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 修改图片切换函数
  const handlePrevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNextImage = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
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
      
      await concurrentProcess(
        files,
        (file, index) => handleFile(file, startIndex + index)
      );
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

  // 添加纠错处理函数
  const handleCorrectText = async () => {
    if (!results[currentIndex] || isCorrectingText) return;
    
    setIsCorrectingText(true);
    try {
      const prompt = CORRECTION_PROMPT.replace('{content}', results[currentIndex]);
      let correctedText = '';

      await streamGeminiContent({
        prompt,
        onTextChunk: (chunkText) => {
          correctedText += chunkText;
          setResults(prev => {
            const newResults = [...prev];
            newResults[currentIndex] = correctedText;
            return newResults;
          });
        }
      });
    } catch (error) {
      console.error('纠错过程出错:', error);
    } finally {
      setIsCorrectingText(false);
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
