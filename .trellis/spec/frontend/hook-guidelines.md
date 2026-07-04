# 自定义 Hook 规范

> 本项目 hook 的实际写法。核心是一个编排 hook `useOcrSession`（`src/hooks/useOcrSession.js`），集中管理 OCR 会话状态与动作，web 端和桌面端共用。

---

## 命名与位置

- hook 一律 `useXxx` 命名，放 `src/hooks/`。
- 具名导出：`export const useOcrSession = () => { ... }`。

---

## 编排 hook 模式

`useOcrSession` 是全项目的会话中枢，把「状态 + setter + 动作」统一收拢，最后**返回一个大对象**，组件按需解构：

```js
export const useOcrSession = () => {
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  // ...更多 state...

  const uploadFiles = useCallback(async (files) => { /* ... */ }, [images.length, handleFile]);
  const cancelRecognition = useCallback(() => { /* ... */ }, []);

  return {
    // 状态
    images, setImages, results, setResults, currentIndex, setCurrentIndex,
    isLoading, setIsLoading, isCorrectingText,
    // 动作
    handleFile, uploadFiles, cancelRecognition, correctCurrentText,
    handlePrevImage, handleNextImage, /* ... */
  };
};
```

组件侧：`const ocr = useOcrSession();` 再解构使用，或整体作为 prop 传给子组件（`<ConfigModal ocr={ocr} />`）。

---

## 动作一律用 `useCallback` 包裹

所有从 hook 暴露的动作都用 `useCallback` 稳定引用，并**显式列全依赖数组**：

```js
const handleImageFile = useCallback(async (file, index) => {
  // ...
}, [callGeminiStream]);

const uploadFiles = useCallback(async (files) => {
  // ...
}, [images.length, handleFile]);
```

- 依赖要写实际用到的值。
- 确需省略依赖时，用 `// eslint-disable-next-line react-hooks/exhaustive-deps` **并在上一行用中文注释解释原因**，参考 `App.js` 粘贴监听：`// handleFile 每次渲染会重新创建，这里仅需基于图片数量重绑监听。`

---

## ref 镜像最新值，规避闭包陈旧

当回调注册一次却要读到最新 state 时，用 ref 镜像该值，并在 `useEffect` 里同步：

```js
const translateEnabledRef = useRef(false);
useEffect(() => { translateEnabledRef.current = translateEnabled; }, [translateEnabled]);
// 之后在稳定回调里读 translateEnabledRef.current，而不是 translateEnabled
```

`App.js` 也用同样手法保存最新 handler：`processClipboardImageRef.current = ocr.processClipboardImage;`，供一次性注册的全局快捷键回调调用。

---

## 取消：AbortController ref 模式

流式请求的取消统一走 `AbortController`，存在 ref 里，**abort 后立即新建一个**，保证后续请求可用：

```js
const abortRef = useRef(null);
if (!abortRef.current) abortRef.current = new AbortController();

const cancelRecognition = useCallback(() => {
  abortRef.current.abort();
  abortRef.current = new AbortController();
  setIsLoading(false);
  setIsCorrectingText(false);
}, []);
```

长循环（PDF 多页、批量上传）在每批前检查 `abortRef.current.signal.aborted` 提前中断。

---

## localStorage 持久化模式

需要持久化的配置用「惰性初始化 + useEffect 回写」：

```js
const [apiKeyConfig, setApiKeyConfig] = useState(() => readStoredValue(API_CONFIG_STORAGE_KEYS.apiKey));
useEffect(() => { writeStoredValue(API_CONFIG_STORAGE_KEYS.apiKey, apiKeyConfig); }, [apiKeyConfig]);
```

读写封装成本地 helper，并带环境守卫 `if (typeof window === 'undefined') return ''`（测试 / SSR 安全）。存储 key 集中成常量对象 `API_CONFIG_STORAGE_KEYS`。

---

## 纯逻辑不进 hook，靠注入

hook 负责**编排与状态**，具体算法放 `src/lib/`，通过参数注入给纯函数：

```js
// hook 里构造流式客户端，注入给 lib 纯函数
const callGeminiStream = useCallback(async ({ prompt, imageData, mimeType, onTextChunk }) => {
  const { apiUrl, apiKey, model } = resolveConfig({ apiUrlConfig, apiKeyConfig, modelConfig });
  return streamGeminiContent({ endpoint: buildGeminiEndpoint(apiUrl, model, apiKey), /* ... */ });
}, [apiUrlConfig, apiKeyConfig, modelConfig]);

// 传入 lib，lib 不关心它从哪来
await recognizeImage({ file, streamClient: callGeminiStream, onTextChunk });
```

这样 `lib/ocr/recognizeImage.js` 等无需 mock 网络即可单测（见 `recognizeImage.test.js`）。

---

## 反模式

- ❌ 动作不包 `useCallback` 就塞进依赖数组 / 传给子组件（会造成无谓重渲染）。
- ❌ 无注释地关闭 `exhaustive-deps`。
- ❌ 在稳定回调里直接闭包读会变的 state——用 ref 镜像。
- ❌ 把网络请求 / 文本处理算法写死在 hook 内——抽到 `lib/` 并注入。
- ❌ abort 后不重建 `AbortController`（后续请求会立刻被取消）。
