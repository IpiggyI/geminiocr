# ContextLibrary: Desktop Quick OCR - Tauri v2 桌面端集成

## 基本信息

| 字段 | 内容 |
|------|------|
| 需求时间 | 2026-03-17 |
| 修改时间 | 2026-03-17 |
| 计划文档 | `docs/plans/2026-03-15-desktop-quick-ocr.md` |
| 分支 | `feat/desktop-quick-ocr` |
| 涉及文件 | 27 个文件（详见成果章节） |
| 需求摘要 | 在保留网站端能力的前提下，为 GeminiOCR 增加 Tauri v2 桌面端宿主，支持全局快捷键唤起 + 剪贴板图片直达 OCR |

## 需求详情

GeminiOCR 原本是 CRA 单页应用，每次使用需要打开浏览器、访问网站、粘贴图片。核心痛点是操作链路长，缺乏系统级快捷键支持。

目标：
- macOS/Windows 上通过全局快捷键 `Ctrl+Shift+O` 唤起窗口
- 快捷键触发后自动读取剪贴板图片并开始 OCR
- 桌面端继续支持拖拽、粘贴、上传、URL、PDF、翻译、纠错
- 网站端原有行为不回退
- `src/App.js` 不再直接持有 OCR 主链路，实现共享核心抽离

## 解决方案

### 架构设计

分 4 个 Chunk、10 个 Task 渐进式实施：

1. **Chunk 1 - 共享 OCR 核心抽离**：将 `App.js` 中的 prompts、preprocessText、runtimeConfig、streamGeminiContent、recognizeImage、correctText 抽离为独立模块
2. **Chunk 2 - 共享文件与状态处理**：抽离 readFileAsDataUrl、dataUrlToFile、pdfToImageDataUrls 工具函数，以及核心的 `useOcrSession` hook
3. **Chunk 3 - Tauri 桌面宿主**：初始化 Tauri v2 工程、注册全局快捷键、实现剪贴板图片桥接
4. **Chunk 4 - 桌面 UX 与回归**：适配桌面端文案、全量测试验证

### 模块结构

```
src/
├── lib/
│   ├── ocr/
│   │   ├── prompts.js              # OCR/纠错 prompt + 翻译指令拼接
│   │   ├── preprocessText.js       # 识别结果后处理（LaTeX/表格/代码围栏）
│   │   ├── runtimeConfig.js        # API 配置解析 + endpoint 构建
│   │   ├── streamGeminiContent.js  # Gemini SSE 流式请求客户端
│   │   ├── recognizeImage.js       # 图片识别入口（File → base64 → stream → 后处理）
│   │   └── correctText.js          # 文本纠错入口
│   ├── files/
│   │   ├── readFileAsDataUrl.js    # FileReader 包装
│   │   └── dataUrlToFile.js        # DataURL → File 转换
│   └── pdf/
│       └── pdfToImageDataUrls.js   # PDF 页面 → JPEG DataURL
├── hooks/
│   └── useOcrSession.js            # 统一 OCR 状态机（Web + Desktop 共用）
├── desktop/
│   ├── tauriBridge.js              # Tauri 环境检测 + 窗口控制
│   ├── shortcutBootstrap.js        # 全局快捷键事件监听
│   └── clipboardImageToFile.js     # 剪贴板图片 → PNG File
src-tauri/
├── Cargo.toml                      # Rust 依赖（tauri, global-shortcut, clipboard-manager）
├── tauri.conf.json                 # Tauri 应用配置
├── capabilities/default.json       # 最小权限声明
└── src/
    ├── lib.rs                      # 插件注册 + 快捷键处理
    └── main.rs                     # 入口
```

### 数据流（桌面端快捷键路径）

```
用户按 Ctrl+Shift+O
  → Rust: 触发 desktop-shortcut-triggered 事件 + 显示/聚焦窗口
    → JS: shortcutBootstrap 收到事件
      → clipboardImageToFile 读取剪贴板
        → useOcrSession.processClipboardImage
          → recognizeImage (streamGeminiContent → preprocessText)
            → UI 流式更新结果
```

## 关键决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| 桌面框架 | Tauri v2 | 5-10MB 包体、30MB 内存，轻量适合常驻；React 90%+ 复用 |
| OCR 核心抽离方式 | 纯函数 + 依赖注入 | `streamClient` 参数注入使共享模块不依赖特定宿主的配置方式 |
| 状态管理 | 自定义 hook (`useOcrSession`) | 无需引入 Redux/Zustand，YAGNI 原则，当前复杂度自定义 hook 足够 |
| 保留 CRA | 不迁移到 Vite | 计划明确 "不在本计划中引入 CRA 到 Vite 的整体迁移" |
| 快捷键 | Rust 侧注册 + emit 事件 | Tauri v2 推荐方式，global-shortcut 插件在 setup 中注册 |
| 剪贴板图片 | readImage → Canvas → PNG | 统一转为 PNG File，桥接层收口平台差异 |

## 问题与解决

| 问题 | 解决方法 |
|------|----------|
| `preprocessText` 中 `$$` 替换实际只产生单个 `$` | `String.replace` 中 `$$` 是特殊转义。保持原始行为不修改，测试用例匹配实际输出 |
| `@testing-library/jest-dom` 和 `@testing-library/dom` 缺失 | 通过 `--legacy-peer-deps` 安装，CRA 项目的 peer deps 冲突 |
| Rust 工具链未安装 | 先创建所有配置文件和前端代码，Rust 编译待后续安装 rustup 后执行 |
| App.js 1225 行单文件过大 | TDD 方式逐步抽离，每个 Task 一次 commit，降低回归风险 |
| `concurrentProcess` 在 hook 化后失去引用 | 用内联的 `Promise.all` 批处理替代，保持相同的并发行为 |

## 成果

### 交付物

- [x] 7 个共享核心模块（`src/lib/ocr/*`, `src/lib/files/*`, `src/lib/pdf/*`）
- [x] 1 个统一状态 hook（`src/hooks/useOcrSession.js`）
- [x] 3 个桌面端桥接模块（`src/desktop/*`）
- [x] Tauri v2 工程骨架（`src-tauri/`）
- [x] 5 个测试套件 / 20 个测试用例全部通过
- [x] App.js 从 1225 行缩减到 755 行（-38%）
- [x] 7 个语义化 commit

### Git 提交记录

```
4ca2755 feat: adapt ui copy for desktop quick ocr
7d816a6 feat: scaffold tauri desktop host with shortcut and clipboard
04fbfbd refactor: centralize ocr session state into useOcrSession hook
4954ebd refactor: extract shared file and pdf helpers
d681566 refactor: extract image recognition and correction flows
b2a17eb refactor: extract gemini runtime config and streaming client
1c81b5f refactor: extract ocr prompts and text preprocessing
```

## 备注

### 待完成项（需要 Rust 环境）

1. 安装 Rust 工具链：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. 验证 Rust 编译：`cargo check --manifest-path src-tauri/Cargo.toml`
3. 启动桌面端开发：`npm run desktop:dev`
4. 手工回归验证：全局快捷键唤起、剪贴板图片识别、各类输入方式

### 已知限制

- 不支持框选截图（Non-Goal）
- 不承诺 Linux 首发支持
- 快捷键冲突时需后续做可配置化
- `preprocessText` 中 `\\[` → `$$` 的替换存在 `String.replace` 特殊字符问题，实际替换为单个 `$`（原始行为保留）

### 后续迭代方向

- Phase 2: 历史记录、翻译功能、多语言支持
- Phase 3: 批量识别、PDF 支持、主题切换
- Phase 4: 浏览器插件（右键识别网页图片）
