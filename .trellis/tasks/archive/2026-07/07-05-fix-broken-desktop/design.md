# 设计：修复桌面功能性断裂

## 根因回顾

capabilities 只授 `core:default`（window 仅只读 getter），JS 侧 hide/show/setFocus/unminimize/destroy 全被拒绝；`core:app:default` 不含 default-window-icon，托盘图标为空。修复策略不是补权限，而是把窗口生命周期整体移到 Rust 侧（无权限依赖、无 bootstrap 时序窗口、webview 加载前即生效）。

## Rust 侧（src-tauri/src/lib.rs）

```
Cargo.toml 新增: tauri-plugin-window-state = "2"
tauri features 需含 "tray-icon"（默认 feature，确认即可）
```

- `setup` 钩子里创建托盘：
  - `TrayIconBuilder::with_id("main-tray")`，icon 用 `app.default_window_icon()`（编译进二进制，无运行时权限问题）
  - 菜单：`显示主窗口`（show+unminimize+set_focus）、`退出 GeminiOCR`（`app.exit(0)`）
  - `on_tray_icon_event`：左键 Up → 显示主窗口
- `on_window_event`：`WindowEvent::CloseRequested { api, .. }` → `api.prevent_close()` + `window.hide()`
- `#[tauri::command] fn show_main_window(app: AppHandle)`：show + unminimize + set_focus；`invoke_handler` 注册
- 单实例插件回调改为调用同一显示函数（现逻辑保留即可，它在 Rust 侧本就有权限）
- 退出路径：托盘退出用 `app.exit(0)`，绕开 CloseRequested 拦截

## JS 侧

- 删除 `windowBootstrap.js` + `windowBootstrap.test.js`；`App.js` 移除 `initDesktopWindowBehavior` 相关 effect 分支与 cleanup ref
- `tauriBridge.showAndFocusWindow` 改为 `invoke('show_main_window')`（`core:default` 已含 `core:allow-invoke`？——invoke 自定义 command 无需额外权限）
- 快捷键链路不变：`initDesktopShortcut` → handler → `clipboardImageToFile` → `showAndFocusWindow`(新实现) → `processClipboardImage`
- header GitHub `<a>` 删除

## 配置

- `tauri.conf.json` windows[0]：`width:1280, height:800, minWidth:900, minHeight:620, dragDropEnabled:false`
- 插件注册顺序：window_state 在 builder 链上加 `plugin(tauri_plugin_window_state::Builder::default().build())`；window-state 恢复的尺寸优先于默认值
- capabilities：保留 `core:default`、global-shortcut 两项、clipboard read-image、http；新增 `window-state:default`（JS 侧不调用其 API 则可不加——按插件文档确认，默认只需 Rust 注册）

## S4 死代码

已移交 `07-05-web-api-security`（重写为口令保护代理），本任务不动 api/。

## S5 preprocessText

`text.replace(/\\\\\[/g, '$$')` 中替换串 `$$` 转义为 `$`。改为函数替换 `() => '$$'`，同理 `\\]`。补测试：输入含 `\\[E=mc^2\\]` 期望 `$$E=mc^2$$`。

## 回滚

各改动独立成 commit：Rust 托盘、拖拽/窗口配置、S4、S5、GitHub 图标移除，可单独 revert。

## 权衡记录

- 不选"补 JS 权限"：保留 StrictMode 双跑、bootstrap 时序、静默失败三个隐患，且托盘图标仍依赖运行时授权
- `dragDropEnabled:false` 的代价：放弃 tauri 原生 drag-drop 事件（本项目只用 HTML5 File 对象，无损失）
