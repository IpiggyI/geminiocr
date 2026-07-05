# 类型安全与契约

> **本项目是纯 JavaScript，没有 TypeScript，也不用 PropTypes。** 类型安全靠三样东西保证：JSDoc 签名注释、运行时守卫校验、以及用「结构化返回对象」表达隐式契约。本文件记录现状，不是引入 TS 的路线图。

---

## 现状

- 源码全部是 `.js`（`src/**`），无 `.ts` / `.tsx`，无 `tsconfig.json`，`package.json` 无 typescript 依赖。
- 无 `PropTypes`、无 Zod / Yup / io-ts 之类运行时 schema 库。
- ESLint 仅用 CRA 预设 `react-app` / `react-app/jest`。

新代码保持一致：不要为「类型安全」擅自引入 TypeScript 或校验库。

---

## JSDoc 标注签名（跨模块函数必写）

`lib/` 和其它被跨模块调用的函数，用 JSDoc 描述参数/返回值形状——这是本项目「类型契约」的主要载体：

```js
/**
 * 识别图片中的文字
 * @param {{ file: File, translateLang?: string, streamClient: Function, onTextChunk: Function }} options
 * @returns {Promise<string>} 识别并后处理后的文本
 */
export const recognizeImage = async ({ file, translateLang, streamClient, onTextChunk }) => { /* ... */ };
```

- 参数用「单个对象 + 解构」风格，JSDoc 用 `@param {{ ... }}` 描述该对象。
- 工厂/高阶函数把返回的函数签名也写清楚，见 `runtimeConfig.js` 的 `createRuntimeConfigResolver`。
- 组件的 props 形状同样用 JSDoc（见 [component-guidelines.md](./component-guidelines.md)）。

---

## 运行时守卫校验

在数据入口和边界处做防御式校验，早退或抛错：

```js
// 类型校验：非图片直接返回
if (!file || !file.type.startsWith('image/')) return '';

// 必填校验：缺 key 抛出中文可读错误
if (!apiKey && isTauri) throw new Error('缺少 Gemini API Key，请在设置中填入 API Key');

// 环境守卫：无 window 时安全退出
if (typeof window === 'undefined') return '';
```

MIME 判断统一用 `file.type.startsWith('image/')` / `=== 'application/pdf'`。

---

## 结构化返回对象 = 隐式类型契约

跨环境、可能失败的操作**不抛异常，而是返回带 `status` / `ok` 判别字段的对象**，调用方按字段分支。这类联合形状用 JSDoc 写明所有取值：

```js
/**
 * @returns {Promise<{ status: 'success' | 'empty' | 'error' | 'unsupported',
 *   file: File | null, message?: string, source?: 'tauri' | 'browser' }>}
 */
export const clipboardImageToFile = async () => { /* ... */ };
```

`applyDesktopShortcut` 同理返回 `{ ok, activeShortcut, message? }`。调用侧据此分支（见 `App.js` 对 `result.status` / `result.ok` 的处理）。

---

## 边界防御常用手法

- 可选链 + 默认值：`payload.candidates || []`、`event?.target`、`window.localStorage ?? null`。
- 归一化后再用：`(value || '').split('+').map(s => s.trim()).filter(Boolean)`（`normalizeDesktopShortcut`）。
- 集合安全化：`Array.from(e.target.files)`、`.filter(Boolean)`、`.filter(file => file !== null)`。
- 错误对象取信息：`error?.message || 'unknown error'`。

---

## 反模式

- ❌ 新增 `.ts` / `.tsx` 或 `tsconfig.json`——与现状不符。
- ❌ 引入 `PropTypes` 或 Zod/Yup 等校验库。
- ❌ 跨模块函数不写 JSDoc，让调用方猜参数形状。
- ❌ 用 `try/catch` 吞掉本应通过 `{ status }` 返回给 UI 的可预期失败。
