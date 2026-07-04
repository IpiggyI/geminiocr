# 组件规范

> 本项目 React 组件的实际写法。组件是纯 JavaScript 函数组件，不使用 class 组件、TypeScript、CSS Modules。

---

## 基本形态

- **一律函数组件**，用箭头或 `function` 声明皆可，跟随所在文件既有风格。
- **默认具名导出**：`export function ConfigModal(...)`（`src/components/ConfigModal.js`）。
  只有顶层 `App.js` 使用 `export default App`——这是入口约定，新组件不要沿用 default 导出。
- props 在参数处解构：`export function ConfigModal({ ocr, desktop, onClose, onSave })`。

```js
// src/components/ConfigModal.js
export function ConfigModal({ ocr, desktop, onClose, onSave }) {
  const { apiUrlConfig, setApiUrlConfig, /* ... */ } = ocr;
  return ( /* JSX */ );
}
```

---

## Props 约定

- **props 形状用 JSDoc 记录在组件上方**（项目无 TypeScript、无 PropTypes）：

```js
/**
 * Gemini API / 翻译 / 桌面快捷键配置弹窗
 * @param {{ ocr: object, desktop: { enabled: boolean, shortcutConfig: string,
 *   setShortcutConfig: Function, shortcutError: string, setShortcutError: Function },
 *   onClose: Function, onSave: Function }} props
 */
```

- **回调 props 用 `onXxx`**（`onClose`、`onSave`），组件内部事件处理器用 `handleXxx`。
- 复杂能力打包成一个对象 prop 传入，而非展开成十几个平级 props——参考 `ConfigModal` 的 `ocr` 与 `desktop` 两个聚合对象。

---

## 受控组件

所有表单输入都是**受控**的：`value` 来自状态，`onChange` 写回状态。

```js
<input
  type="password"
  value={apiKeyConfig}
  onChange={(e) => setApiKeyConfig(e.target.value)}
  className="api-config-input"
  autoComplete="off"
/>
```

特殊输入（如快捷键录制框）用 `readOnly` + `onKeyDown` 拦截，配 `onChange={() => {}}` 占位（见 `ConfigModal.js` 桌面快捷键字段）。

---

## 数据来源：组件不自己发请求

组件只负责展示与转发事件，**业务动作从 hook / props 取**：

- `App.js` 通过 `const ocr = useOcrSession()` 拿到全部动作与状态，再解构使用；
- `ConfigModal` 通过 `ocr` prop 拿到配置 state 与 setter，自身不 import 任何 lib。

不要在展示组件里直接调用 `fetch` / `lib/*`——这类逻辑属于 `useOcrSession` 或 `lib/`。

---

## 样式

- **全局 CSS**，无 CSS Modules、无 styled-components、无 Tailwind。样式集中在 `src/App.css`、`src/index.css`。
- 用字符串 `className`，模板串拼接条件类：

```js
<div className={`upload-zone ${isDragging ? 'dragging' : ''}`}>
<label className={`config-field${apiUrlConfig ? ' config-field--custom' : ''}`}>
```

- 类名遵循既有的 BEM 风味（`config-field`、`config-field--custom`、`config-field-badge--env`）。
- 少量一次性样式用内联 `style={{ ... }}`（如 `display: isCompact ? 'none' : 'flex'`），不要为此新建 CSS 方案。

---

## 图标

图标一律**内联 SVG** 写在 JSX 里（`viewBox` + `path`），配 `aria-hidden="true"`；不引入图标库。参考 `App.js` 的设置齿轮 / GitHub 图标、`ConfigModal.js` 的字段图标。

---

## 条件渲染

- 用 `{condition && (<JSX/>)}` 短路渲染整块 UI（`App.js` 的结果区、URL 输入表单、模态框）。
- 提前返回处理空态：`if (!toasts.length) return null;`（`Toast.js` 的 `ToastHost`）。

---

## 全局提示：Toast 模式（替代 alert）

需要给用户非阻塞反馈时，**用 `toast()` 而不是 `alert()`**。Toast 采用「模块级发布订阅 + 单一宿主组件」模式（`src/components/Toast.js`）：

```js
// 任意模块（含非 React 代码）都能调用：
import { toast } from './components/Toast';
toast('剪贴板中没有图片', { type: 'error', duration: 8000 });
```

- 页面需挂载一次 `<ToastHost />`（已在 `App.js` 顶部）。
- `type` 取 `'info' | 'error'`（映射到 `toast--info` / `toast--error` 类）。
- 宿主用 `role="status"` + `aria-live="polite"`，并在卸载时清理所有定时器。

---

## 无障碍实践（延续现状）

现有代码已有一致的无障碍处理，新组件请延续：
- 交互按钮加 `aria-label`（如设置按钮 `aria-label="打开 API 配置"`）；
- 纯装饰 SVG 加 `aria-hidden="true"`；
- 动态提示容器用 `role="status"` / `aria-live`。

---

## 反模式（本项目不要出现）

- ❌ class 组件、`React.Component`。
- ❌ 给组件加 TypeScript 类型或 `PropTypes`——用 JSDoc 记录 props。
- ❌ CSS Modules / styled-components / Tailwind——用全局 `App.css`。
- ❌ 展示组件内直接 `fetch` 或 import `lib/*` 业务逻辑。
- ❌ `alert()` / `window.confirm()`——用 `toast()`。
- ❌ 引入图标库——内联 SVG。
