# 桌面端集成（Tauri 桥接层）

> 同一套 `src/` React 代码同时跑在浏览器和 Tauri 桌面壳里。`src/desktop/` 是**唯一**的 Tauri 桥接层，负责在桌面端提供原生能力、在 web 端安全降级。新增任何桌面能力都必须遵守本文件的守卫与降级约定。

---

## 双端架构

- Web 端：CRA 构建，纯浏览器 API。
- 桌面端：Tauri 2（`src-tauri/` 是 Rust 壳），前端通过 `@tauri-apps/api` 及各 `@tauri-apps/plugin-*` 调用原生能力。
- 前端**不做条件编译**：同一份代码在两端运行，靠运行时 `isTauri()` 判定环境并分支。

---

## 环境检测：`isTauri()` 守卫

所有桥接函数以 `isTauri()`（`src/desktop/tauriBridge.js`）判定，web 环境**返回安全默认值而非报错**：

```js
export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const showAndFocusWindow = async () => {
  if (!isTauri()) return;                 // web 环境静默跳过
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  // ...
};
```

降级返回值要贴合调用方期望：
- 无副作用操作 → `return;`（`showAndFocusWindow`）；
- 需要 cleanup 的 → 返回**空 cleanup 函数** `return async () => {};`（`initDesktopWindowBehavior`）；
- 带结果语义的 → 返回结构化对象 `{ ok: true, activeShortcut }` / `{ status: 'unsupported', ... }`。

---

## `@tauri-apps/*` 一律动态 import

**绝不在模块顶层静态 import `@tauri-apps/*`**，一律在 `isTauri()` 守卫**之后**用 `await import(...)`：

```js
const registerShortcut = async (shortcut, onTriggered) => {
  const { register } = await import('@tauri-apps/plugin-global-shortcut');
  await register(shortcut, (event) => { /* ... */ });
};
```

原因：静态 import 会把 Tauri 运行时打进 web bundle，浏览器加载即报错。动态 import 保证 web 端根本不加载这些模块。需要并行加载多个时用 `Promise.all([...])`（见 `windowBootstrap.js`）。

---

## 结构化结果对象

桥接操作把成功/失败/降级都编码进返回对象，交给 UI 分支，不靠抛异常穿透到组件：

```js
// clipboardImageToFile.js
{ status: 'success' | 'empty' | 'error' | 'unsupported', file: File | null, message?, source? }
// shortcutBootstrap.js
{ ok: boolean, activeShortcut: string, message?, cleanup: () => Promise<void> }
```

`App.js` 据此分支：`success` → 处理图片；其余 → `toast(result.message, { type: ... })`。错误信息用中文并附原始 detail。

---

## 各桥接模块职责

| 模块 | 职责 | 关键点 |
|------|------|--------|
| `tauriBridge.js` | 环境检测、窗口显示/聚焦 | `isTauri()`、`showAndFocusWindow` |
| `desktopPreferences.js` | 快捷键归一化 + localStorage 持久化 | 等于默认值即删 key；`typeof window` 守卫 |
| `shortcutBootstrap.js` | 全局快捷键注册/注销 | 模块级 `registeredShortcut` 单例；先注销旧的再注册；返回 `cleanup` |
| `shortcutRecorder.js` | 键盘事件 → 快捷键字符串 | 供 ConfigModal 录制 |
| `windowBootstrap.js` | 托盘图标 + 关闭拦截 | `onCloseRequested` → `preventDefault` + `hide`；返回 cleanup 关闭托盘 |
| `clipboardImageToFile.js` | 读剪贴板图片为 File | Tauri 优先、浏览器 `navigator.clipboard` 回退 |
| `pasteGuards.js` | 判断粘贴事件是否该全局处理 | 编辑态元素内不拦截 |

---

## 桥接内部的回退链

桥接函数内部也遵循「优先原生、失败回退」并记录日志。`clipboardImageToFile` 是范例：先 `readTauriClipboardImage()`，捕获后再试 `readBrowserClipboardImage()`，区分「剪贴板为空」（`EMPTY_CLIPBOARD_PATTERN`）与真错误，分别返回 `empty` / `error`。

---

## App 层编排

桌面初始化集中在 `App.js` 一个 `useEffect(..., [])` 里：

- `if (!desktopMode) return;` 先短路 web 端。
- 用 `Promise.allSettled([initDesktopWindowBehavior(), initDesktopShortcut(...)])` 并行启动，单项失败不拖垮另一项。
- `disposed` 标志防竞态：effect 已清理但异步初始化才返回时，立即回滚（调用其 cleanup）。
- cleanup 函数存进 ref（`desktopShortcutCleanupRef` / `desktopWindowCleanupRef`），在 effect 卸载时 `void cleanup()`。
- 触发回调读最新 handler 用 ref（`desktopShortcutHandlerRef.current`），避免一次性注册闭包陈旧（见 [hook-guidelines.md](./hook-guidelines.md)）。

派生 UI 差异用 `desktopMode` / `isCompact` 分支：桌面端展示快捷键提示文案，且**桌面窗口不进入移动端降级布局**（`const isCompact = isMobile && !desktopMode;`）。

---

## 测试

- 测桌面路径时，在 `beforeEach` 里设 `window.__TAURI_INTERNALS__ = {}` 驱动真实的 `isTauri()` 返回 true，并 `jest.mock('@tauri-apps/...')` 掉各原生模块；web 路径则不设该全局。
- 测试断言桥接函数在非 Tauri 环境返回约定的降级值（如 `{ ok: true, activeShortcut }`、空 cleanup）。
- 参考 `windowBootstrap.test.js`、`clipboardImageToFile.test.js`、`shortcutBootstrap.test.js`、`App.desktop.test.js`。

---

## 反模式

- ❌ 顶层静态 `import ... from '@tauri-apps/...'`（会污染 web bundle）。
- ❌ 桥接函数在 web 环境抛错，而不是返回降级值。
- ❌ 桌面能力散落到组件里，不经 `src/desktop/` 桥接层。
- ❌ 桌面初始化失败让整个 effect 崩溃（应 `Promise.allSettled` 逐项容错）。
- ❌ 忽略 cleanup / `disposed` 竞态，导致托盘或快捷键泄漏。
