# 执行计划：主界面重做

> **进度（2026-07-06）**：✅ 步骤1（ac5018c）· ✅ 步骤2（e8cc00a）· ✅ 步骤3（852f7db）· ✅ 步骤4（9029e0e，实机过）· ✅ 步骤5（047301d，交互验收过）· ✅ 步骤6 断点统一(.app--compact)+CSS 去重（**8f2491d**）· ✅ **步骤7 自动化回归（20 suites/94 green + build 过；Web/桌面手动点检用户自排）**。全 7 步代码完成；父任务待全子任务验收后统一归档。
> 执行方式：主线程 inline（core 架构不委派）。验证 `CI=true npx react-scripts test --watchAll=false`（现 20 suites/94 tests 绿，步骤6 删了 appendTranslateInstruction 测试 95→94）。
> **步骤6 落码摘要**：App.js `isMobile` 改 `matchMedia('(max-width:768px)')`（初值 + change 监听）+ 根 div `.app--compact` 类；App.css 加 `.app--compact .toolbar-row{flex-wrap:wrap}`、删 5 处死 media + 13 个死类（upload-section/container/button、content-container、drag-overlay、upload-hint、url-button、images-preview、image-navigation、nav-button、image-counter、result-header、copy-button）+ 死子选择器；删 prompts.js `appendTranslateInstruction` 死路径 + recognizeImage.js 的 translateLang 分支 + 对应测试；setupTests.js 补 jsdom `matchMedia` mock。净删 265 行，build 成功 eslint 干净，括号 445/445。**未做**：dev server 目视 768px 上下 + 桌面窄窗三宽度（run 级待批准）。

前置：第一批已完成合入（windowBootstrap 已删、拖拽可用）。

1. **数据流改造（不动 UI）**
   - useOcrSession：`translations`/`errors`/`files` 状态 + `translateResult` + 识别 catch 改错误通道
   - prompts.js 加 `TRANSLATE_PROMPT`；识别 prompt 去翻译拼接
   - 先写测试：自动翻译触发、翻译失败不污染 results、错误不写入 results
   - 验证：`npm test -- useOcrSession`
2. **组件拆分（视觉不变的机械搬运）**
   - 依次析出 Toolbar/UploadDropzone/ImagePane/ResultPane + icons.js，App.js 减负
   - 验证：`npm test`；`npm start` 肉眼回归无样式变化
3. **空态 dropzone 重排**：相机图标 + 文案 + 按钮排；清除按钮逻辑（清 images/results/translations/errors + revokeObjectURL）
   - 验证：空态四按钮行为 + 拖拽/点击/粘贴三入口
4. **有图态左图右文**：SplitPane + 缩略图条 + 顶部工具条；删 with-image 压缩样式
   - 验证：多图切换、分隔条拖动持久化、窗口窄化不破版
5. **ResultPane tab + 图标按钮 + 重试**
   - 验证：原文/译文切换、复制反馈、纠错、失败重试
6. **断点统一 + CSS 迁移清理**：`.app--compact` 方案落地，App.css 删除已迁移/重复规则
   - 验证：`npm run build`；768px 上下、桌面窄窗口三种宽度检查
7. **全量回归**：`npm test`；Web 端上传/粘贴/URL/PDF/翻译/纠错；桌面端 `npx tauri dev` 快检

回滚点：步骤 1/2/4/6 各自独立 commit。
评审门：步骤 2 后（拆分不变形确认）、步骤 5 后（交互验收）。

执行约定（用户 2026-07-05）：
- 步骤 3/4/5 涉及视觉设计时调用 `frontend-design` 与 `ui-ux-pro-max` 系 skill 辅助设计决策（配色/排版/组件形态），产出先给用户过目再落码
- 重试逻辑：`retryRecognition(index)` 记录尝试次数，第 2 次起在 OCR prompt 末尾追加重试提示语
