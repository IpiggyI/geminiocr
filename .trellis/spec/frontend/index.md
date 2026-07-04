# 前端开发规范

> 本项目前端（`src/`）的编码约定。技术栈：React 18 + CRA（`react-scripts`）+ Tauri 2 桌面端，**纯 JavaScript（无 TypeScript）**，无全局状态库、无 CSS 方案库。所有规则以真实代码为准。

---

## 规范索引

| 规范 | 内容 |
|------|------|
| [目录结构](./directory-structure.md) | `src/` 分层（App → hooks → lib）、命名约定、新功能落位 |
| [组件规范](./component-guidelines.md) | 函数组件 + 具名导出、JSDoc props、受控组件、全局 CSS、Toast、无障碍 |
| [Hook 规范](./hook-guidelines.md) | 编排 hook `useOcrSession`、`useCallback` 依赖、ref 镜像、AbortController、依赖注入 |
| [状态管理](./state-management.md) | 无全局库、状态分层、不可变更新、派生状态、localStorage、配置回落链 |
| [类型安全与契约](./type-safety.md) | 纯 JS 现状、JSDoc 签名、运行时守卫、结构化返回对象 |
| [质量规范](./quality-guidelines.md) | Jest + RTL 测试、ESLint、错误处理与日志、审查清单 |
| [桌面端集成](./desktop-integration.md) | Tauri 桥接层：`isTauri()` 守卫、动态 import、结构化结果、App 层编排 |

---

## 快速心智模型

```
App.js（编排：UI + 全局事件 + 弹窗）
  ├─ useOcrSession（会话状态与动作，web/桌面共用）
  │    └─ lib/{ocr,files,pdf}（纯逻辑，依赖注入，可单测）
  ├─ components/（受控展示组件，数据来自 props/hook）
  └─ desktop/（Tauri 桥接层，web 安全降级）
```

- 业务状态进 `useOcrSession`；纯 UI 开关留组件本地。
- 纯逻辑放 `lib/` 并通过参数注入，不 import React。
- 触达 Tauri 一律 `isTauri()` 守卫 + 动态 import。
- 状态不可变更新；跨模块函数写 JSDoc；`lib/` 与 hook 配同目录 `.test.js`。

---

**说明**：本目录规范正文用中文书写，代码示例保留仓库原有的中文注释；`api/`（Vercel Serverless）与 `src-tauri/`（Rust）不在本前端规范范围内。
