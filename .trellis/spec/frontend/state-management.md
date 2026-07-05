# 状态管理

> 本项目如何管理状态。**没有任何全局状态库**（无 Redux / Zustand / MobX / Context Provider），全部基于 React 内置 `useState` / `useRef` + 一个编排 hook。

---

## 状态分层

| 类别 | 存放位置 | 例子 |
|------|----------|------|
| 会话业务状态 | `useOcrSession`（`src/hooks/useOcrSession.js`） | `images`、`results`、`currentIndex`、`isLoading`、API 配置、翻译配置 |
| 纯 UI 局部状态 | 使用它的组件内 `useState` | `App.js` 的 `isDragging`、`showModal`、`showConfigModal`、`imageUrl` |
| 派生状态 | 渲染时直接计算，不额外存 | `const isCompact = isMobile && !desktopMode;` |
| 非渲染可变值 | `useRef` | `abortRef`、`processClipboardImageRef`、各种 cleanup ref |
| 持久化配置 | `localStorage`（经 helper 封装） | Gemini API 配置、桌面快捷键 |

判定原则：**多个动作共享、或需跨 web/桌面复用的业务状态 → 进 `useOcrSession`**；只服务单个组件视图的开关/输入 → 留在该组件本地。

---

## 不可变更新（强约定）

数组 / 对象状态一律**函数式不可变更新**，尤其按索引改数组时先拷贝：

```js
setResults(prev => {
  const newResults = [...prev];
  newResults[index] = liveText;
  return newResults;
});

setImages(prev => [...prev, imageUrl]);
```

插入多项用 `splice` 在副本上操作（PDF 展开为多页，见 `useOcrSession.js` 的 `handlePdfFile`）：

```js
setImages(prev => {
  const next = [...prev];
  next.splice(startIndex, 1, ...pdfImages);
  return next;
});
```

绝不直接 `results[index] = x` 后 `setResults(results)`。

---

## 派生状态不落地

能从现有 state 算出来的值就地算，不要再用一个 `useState` + `useEffect` 去同步：

```js
const isCompact = isMobile && !desktopMode;               // App.js
<main className={images.length > 0 ? 'has-content' : ''}>  // 直接用长度判断
```

---

## ref 作为「不触发渲染的可变值」

需要在渲染之间保留、但改变不应触发重渲染的值，用 `useRef`：
- 取消控制器 `abortRef`；
- 一次性注册的回调里要读的最新 handler（`processClipboardImageRef`、`desktopShortcutHandlerRef`）；
- 桌面清理函数（`desktopShortcutCleanupRef`、`desktopWindowCleanupRef`）。

配合 hook 规范里的「ref 镜像最新值」模式使用。

---

## 持久化状态（localStorage）

两处持久化，均封装读写 helper 并带 `typeof window` 守卫：

1. **Gemini API 配置**（`useOcrSession.js`）：key 集中在 `API_CONFIG_STORAGE_KEYS`，惰性初始化 + `useEffect` 回写；空值时 `removeItem`。
2. **桌面快捷键**（`src/desktop/desktopPreferences.js`）：`load/saveDesktopShortcut`，先 `normalizeDesktopShortcut` 再存；等于默认值时删除 key（保持「未自定义即回落默认」语义）。

存储值的读写要有「空值 = 回落默认 / 环境变量」的语义，不要存空串。

---

## 配置回落链（一种配置状态解析）

运行时配置遵循**页面配置优先、环境变量兜底**，用工厂函数解析（`src/lib/ocr/runtimeConfig.js`）。解析器返回**带 `mode` 判别字段**的配置对象，调用方（`useOcrSession.callGeminiStream`）据此决定直连还是走服务端代理：

```js
const model = (modelConfig.trim() || envConfig.model).replace(/^models\//, '');
const apiKey = apiKeyConfig.trim();

if (apiKey) {                       // 页面填 Key → 直连；不读取 REACT_APP_GEMINI_API_KEY
  return { mode: 'direct', apiUrl: apiUrlConfig.trim() || envConfig.apiUrl, apiKey, model };
}
if (isTauri) {                      // 桌面端无 Key → 抛缺 Key 引导（不走代理）
  throw new Error('缺少 Gemini API Key，请在设置中填入 API Key');
}
const accessToken = accessTokenConfig.trim();   // Web 端无 Key → 口令代理
if (!accessToken) throw new Error('缺少访问口令，请在设置中填入访问口令');
return { mode: 'proxy', apiUrl: PROXY_API_BASE, accessToken, model };
```

要点：**页面 Key 优先直连、Web 端缺 Key 回落到口令保护的服务端代理（`/api/gemini`，见 `api/gemini.js`）、桌面端恒直连**。敏感 Key 不走 `REACT_APP_*` 构建期变量，`scripts/check-env-safety.js` 必须在 `prestart` / `prebuild` 拦截 `REACT_APP_GEMINI_API_KEY`；新增非敏感可配置项时沿用 `pageConfig.trim() || envConfig.x` 的回落写法，并在解析器里集中校验；返回联合形状用 `mode` 判别，别让调用方猜。

---

## 反模式

- ❌ 引入 Redux / Zustand / Context Provider 做全局状态——本项目用编排 hook。
- ❌ 直接 mutate 数组/对象再 set（`arr[i]=x; setArr(arr)`）。
- ❌ 为可推导的值单独建 state + useEffect 同步——直接在渲染中计算。
- ❌ 把纯 UI 开关（拖拽高亮、弹窗显隐）提升进 `useOcrSession`。
- ❌ 裸用 `localStorage` 不加 `typeof window` 守卫（测试环境会炸）。
