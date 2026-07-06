# Web API 安全：服务端 Key + 口令保护流式代理

## Goal

消除两个暴露面：① `REACT_APP_GEMINI_API_KEY` 构建期烤入公网 bundle（Key 本体泄露，S4-b）；② `api/` 无鉴权公开端点（S4-a）。同时保住 Web 端"不用每次手填 Key"的便利（用户 2026-07-05 决策：保留内置 API 能力 + 访问口令防线，不采用直接删除方案）。

## Requirements

1. **服务端 Key**：Vercel 环境变量改用无前缀 `GEMINI_API_KEY`（仅服务端可见）；`REACT_APP_GEMINI_API_KEY` 从部署配置移除（运维步骤，用户执行）；README 部署说明同步更新
2. **流式透明代理**：`api/` 旧三函数（recognize/recognizeOpenAI/recognizeSync）删除，新增单一代理端点：
   - 接收前端原样的 Gemini `streamGenerateContent` 请求体，注入服务端 Key 转发到 `GEMINI_API_URL`（可配，默认官方），SSE 响应流式透传
   - 前端 `streamGeminiContent` 的 SSE 解析零改动，仅端点基址切换
3. **访问口令**：代理校验 `x-access-token` 头 == 服务端 `ACCESS_TOKEN` 环境变量，不匹配返回 401；`ACCESS_TOKEN` 未配置时代理直接 503（禁止裸奔）
4. **前端接入（仅 Web 端）**：
   - 解析优先级：页面填了自己的 Key → 直连（现行为不变）；未填 Key 且非 Tauri → 走代理模式，请求带口令头
   - 口令输入：设置界面 API 组增加"访问口令"字段（Web 端显示），localStorage 持久化，一次填写长期有效
   - 401 时 toast 提示口令错误并引导设置
5. **桌面端零影响**：isTauri 恒直连，不出现口令字段
6. **Key 轮换提示**：现网 Key 已随 bundle 公开暴露，视为已泄露；交付物含给用户的操作清单（撤旧 Key、生成新 Key、配 `GEMINI_API_KEY` + `ACCESS_TOKEN`）

## Acceptance Criteria

- [ ] 构建产物 `build/` 中 grep 不到任何 API Key
- [ ] 无口令/错口令 POST 代理 → 401；正确口令 → SSE 流式返回与直连格式一致
- [ ] `ACCESS_TOKEN` 未配置时代理拒绝服务（503）
- [ ] Web 端未填 Key：配置口令后识别/翻译/纠错全链路可用；填了自己的 Key 则直连不带口令
- [ ] 桌面端行为与改造前完全一致
- [ ] 旧三端点返回 404（文件已删）；vercel.json rewrite 相应调整
- [ ] `npm test` 全绿（新增：解析优先级与口令头测试）

## Notes

- 排序建议：可与第一批并行或紧随其后（安全止血优先于 UI 批次）；口令字段先落现有 ConfigModal，第三批设置视图迁移时一并带走（依赖关系已写入第三批 prd 无需改动——迁移属机械搬运）
- 立即止血（不等本任务）：用户可先在 Vercel 撤下 `REACT_APP_GEMINI_API_KEY` 并轮换 Key；代价是代理上线前网页版需手填 Key
- 残留风险：口令本身存 localStorage 明文（与 Key 同级风险，可接受）；口令泄露则等同旧问题，必要时后续加限流（用户已选不做）
