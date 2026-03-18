# 桌面端四项问题修复计划

- 任务背景：2026-03-18 13:58:32 CST，桌面端存在配置弹窗无法粘贴、默认配置回落认知不清、快捷键不可配置且剪贴板误报、关闭直接退出不进托盘四个问题。
- 选定方案：前端接管全局快捷键注册与窗口关闭行为，Tauri Rust 侧只保留插件初始化；剪贴板读取改为可诊断结果并增加浏览器剪贴板兜底；托盘通过 Tauri JS API 创建并提供显示/退出菜单。
- 执行步骤：
  1. 为粘贴目标判定、快捷键注册/持久化、剪贴板读取结果、关闭转托盘补测试。
  2. 调整 `App.js` 的全局粘贴监听，只在非输入场景接管图片/图片链接粘贴。
  3. 新增桌面快捷键配置与本地持久化，初始化时动态注册，保存时热更新。
  4. 改造剪贴板读取返回结构，区分无图和读取失败，并增加 `navigator.clipboard.read()` 兜底。
  5. 接入 Tauri 窗口关闭拦截和系统托盘，关闭按钮默认隐藏到托盘，托盘支持恢复窗口和退出。
  6. 运行相关前端测试，必要时补一轮桌面构建检查。
- 涉及文件：
  - `src/App.js`
  - `src/App.test.js`
  - `src/desktop/clipboardImageToFile.js`
  - `src/desktop/shortcutBootstrap.js`
  - `src/desktop/tauriBridge.js`
  - `src/desktop/*.test.js`
  - `src-tauri/src/lib.rs`
  - `src-tauri/Cargo.toml`
