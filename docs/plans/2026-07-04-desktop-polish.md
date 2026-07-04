# 桌面端精装修计划（硬伤修复 + 体验与底座）

- 任务背景：2026-07-04，桌面端 v0.1.4 基本可用后全面评审，圈定两批施工：硬伤修复（bug/安全/发布配置）与体验底座（toast、可取消、快捷键录制、依赖清理、组件拆分）。CRA→Vite 与框选截图单独立项，本轮不做。
- 选定方案：前端为主、Rust 侧只加两个插件（single-instance、http）；不改共享 OCR 核心的对外接口；纯逻辑新模块按仓库既有模式补测试。

## 执行步骤

### 硬伤修复
1. isMobile 桌面豁免：桌面模式不进入移动端降级（设置按钮、URL 入口、拖拽在窄窗口下保持可用）。
2. dragover 监听泄漏：add/remove 使用同一函数引用。
3. 安全收口：关闭 KaTeX `trust`；`tauri.conf.json` 配置 CSP（connect-src 放行 https 以兼容自定义 API 地址）。
4. PDF worker 本地化：删除 `public/index.html` 的 unpkg `@latest` 脚本标签；`workerSrc` 改为本地打包资源（保留 `pdfjs-dist` 依赖）。
5. capability 收窄：移除未使用的 `global-shortcut:allow-register-all` / `allow-unregister-all` / `allow-is-registered`。
6. 版本统一 0.1.5：`tauri.conf.json`、`src-tauri/Cargo.toml`、`package.json`。
7. 单实例：`tauri-plugin-single-instance`，二次启动时显示并聚焦主窗口。
8. URL 识图桌面直连：新增 `src/lib/files/fetchImageBlob.js`，桌面走 `@tauri-apps/plugin-http` 直连，Web 保留现有代理链；`handleUrlSubmit`/`handleDrop` 改用该模块。

### 体验与底座
9. Toast 系统：新增轻量非阻塞 toast（无新依赖），替换 App 内全部 `alert()`。
10. 识别可取消：`streamGeminiContent` 透传 `AbortSignal`，`useOcrSession` 暴露取消动作，加载态提供取消按钮，取消后结果标记"已取消"。
11. 快捷键录制输入：新增 `src/desktop/shortcutRecorder.js`（KeyboardEvent → Tauri accelerator 纯函数 + 测试），配置弹窗快捷键输入改为按键捕获式。
12. 依赖清理：移除未使用依赖（mammoth、xlsx、@google/generative-ai、markdown-it 全家、react-markdown + remark/rehype 全家、react-katex、react-markdown-editor-lite、react-text-transition、react-type-animation、github-markdown-css、cra-template）；保留 pdfjs-dist（worker 本地化需要）。
13. 拆分 ConfigModal：配置弹窗从 `App.js` 抽为 `src/components/ConfigModal.js`。

## 验证
- `npm test -- --watch=false` 全绿
- `npm run build` 成功
- `cargo check --manifest-path src-tauri/Cargo.toml`（本地 WSL 若缺 gtk 系统库则以 CI 为准并注明）
- 手工回归项：桌面窄窗口可打开设置；快捷键录制保存生效；识别中可取消；URL 识图桌面端不经第三方代理

## 涉及文件
- `src/App.js`、`src/App.css`、`src/App.desktop.test.js`、`public/index.html`
- `src/components/ConfigModal.js`、`src/components/Toast.js`（新增）
- `src/lib/files/fetchImageBlob.js`（新增）、`src/lib/pdf/pdfToImageDataUrls.js`、`src/lib/ocr/streamGeminiContent.js`
- `src/hooks/useOcrSession.js`
- `src/desktop/shortcutRecorder.js`（新增 + 测试）
- `src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`src-tauri/src/lib.rs`、`src-tauri/capabilities/default.json`
- `package.json`
