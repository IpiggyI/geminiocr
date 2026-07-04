# 目录结构

> 本项目前端代码的组织方式。以真实代码为准（`src/` 下均为纯 JavaScript + React 18，通过 CRA `react-scripts` 构建）。

---

## 总览

仓库同时是一个 Web 应用和一个 Tauri 桌面应用，共用同一套 `src/` 前端代码：

```
├── src/            # React 前端（web + 桌面共用）
├── api/            # Vercel Serverless Functions（Node，非本 spec 范围）
├── src-tauri/      # Tauri 桌面壳（Rust，非本 spec 范围）
├── public/         # 静态资源（pdf-icon.png、pdf.worker 等）
├── scripts/        # 构建脚本（copy-pdf-worker.js）
└── build/          # CRA 构建产物
```

前端所有约定只覆盖 `src/`。`api/`（Vercel）与 `src-tauri/`（Rust）有各自的技术栈，不在此约束。

---

## `src/` 目录布局

```
src/
├── index.js                    # CRA 入口，React.StrictMode 挂载 <App />
├── App.js                      # 顶层组件：编排 UI、事件监听、弹窗（唯一 default 导出组件）
├── App.css / index.css         # 全局样式（无 CSS Modules）
├── logo.svg
├── reportWebVitals.js
├── setupTests.js               # jest 环境初始化
│
├── components/                 # 展示型 / 可复用组件
│   ├── ConfigModal.js          # 受控表单弹窗（具名导出）
│   └── Toast.js                # 全局非阻塞提示（模块级 listeners + <ToastHost/>）
│
├── hooks/                      # 自定义 hook
│   └── useOcrSession.js        # 唯一编排 hook：集中 OCR 会话状态与动作
│
├── desktop/                    # Tauri 桥接层（web 环境安全降级，详见 desktop-integration.md）
│   ├── tauriBridge.js
│   ├── desktopPreferences.js
│   ├── shortcutBootstrap.js
│   ├── shortcutRecorder.js
│   ├── windowBootstrap.js
│   ├── clipboardImageToFile.js
│   └── pasteGuards.js
│
└── lib/                        # 纯逻辑，无 React 依赖，可独立单测
    ├── ocr/                    # runtimeConfig / streamGeminiContent / recognizeImage
    │                           # / correctText / preprocessText / prompts
    ├── files/                  # readFileAsDataUrl / dataUrlToFile / fetchImageBlob
    └── pdf/                    # pdfToImageDataUrls
```

---

## 分层原则

代码按「UI 编排 → 会话状态 → 纯逻辑」自上而下分层，依赖只向下：

| 层 | 位置 | 职责 | 依赖 |
|----|------|------|------|
| 编排层 | `src/App.js` | 组装界面、注册全局事件（粘贴/拖拽/快捷键/resize）、控制弹窗 | 依赖 hook、components、desktop、lib |
| 会话状态层 | `src/hooks/useOcrSession.js` | 集中 OCR 会话的 state 与动作，web/desktop 共用 | 依赖 lib，不依赖 UI |
| 展示层 | `src/components/` | 受控展示组件 | 依赖 props/hook，不直接发请求 |
| 桥接层 | `src/desktop/` | 封装 Tauri 能力，web 环境安全降级 | 依赖 `@tauri-apps/*`（动态 import） |
| 纯逻辑层 | `src/lib/` | OCR 请求/文本后处理/文件转换等纯函数，通过参数注入依赖 | 无 React、无环境耦合 |

**关键约束**：`lib/` 里的纯逻辑不 import React、不直接读环境或全局状态。需要外部能力时通过参数注入——例如 `recognizeImage({ streamClient, onTextChunk })`（`src/lib/ocr/recognizeImage.js`）接收 `streamClient` 而不是自己 import 流式客户端。这样 lib 可脱离 React 单测。

---

## 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件文件 | PascalCase，具名导出 | `components/ConfigModal.js` → `export function ConfigModal` |
| hook 文件 | `useXxx` camelCase | `hooks/useOcrSession.js` → `export const useOcrSession` |
| 纯逻辑 / 桥接模块 | camelCase，动词或名词 | `lib/ocr/recognizeImage.js`、`desktop/tauriBridge.js` |
| 测试文件 | 与被测文件同名 + `.test.js`，**同目录** | `Toast.js` ↔ `Toast.test.js` |
| 常量 | 模块内 `SCREAMING_SNAKE_CASE` | `DEFAULT_GEMINI_MODEL`、`API_CONFIG_STORAGE_KEYS` |

导入一律用相对路径（无路径别名 / jsconfig paths），例如 `import { useOcrSession } from './hooks/useOcrSession'`。

---

## 新增功能应放在哪里

- **新纯逻辑（转换/请求/解析）**：放 `src/lib/<域>/`，写成纯函数并配同目录 `.test.js`。
- **新会话状态 / 动作**：加进 `useOcrSession`，从返回对象暴露；不要在组件里散落业务状态。
- **新展示组件**：放 `src/components/`，具名导出，状态由 props / hook 传入。
- **新桌面能力**：放 `src/desktop/`，遵循 `isTauri()` 守卫 + 动态 import（见 [desktop-integration.md](./desktop-integration.md)）。
- **纯 UI 局部状态**（拖拽高亮、弹窗开关）：留在 `App.js` 的 `useState`，不必进 hook。

---

## 示例（可直接参考的良好组织）

- 分层依赖注入：`src/hooks/useOcrSession.js` → `src/lib/ocr/recognizeImage.js` → `src/lib/ocr/streamGeminiContent.js`
- 桥接层降级：`src/desktop/tauriBridge.js`、`src/desktop/clipboardImageToFile.js`
- 纯逻辑 + 同目录测试：`src/lib/ocr/runtimeConfig.js` ↔ `src/lib/ocr/runtimeConfig.test.js`
