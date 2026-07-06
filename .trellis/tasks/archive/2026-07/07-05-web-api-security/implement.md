# 执行计划：服务端 Key + 口令保护流式代理

前置：design.md 已评审。与第一批无代码冲突，可并行；若并行，注意二者都动 vercel.json 的合并。

1. **代理端点**
   - 新建 `api/gemini.js` 固定路由（405/503/401 门 → 注入服务端 `?key=` → SSE 透传）；删旧三函数；package.json 移除 `@google/generative-ai`；vercel.json rewrite 校对
   - 先写测试（node 环境单测 handler 的三个拒绝分支 + 转发参数拼装，上游 fetch mock）
   - 验证：`npm test -- api`；`vercel dev` 本地起函数用 curl 验证 401/流式透传
2. **前端代理模式**
   - runtimeConfig 代理分支 + buildGeminiEndpoint 免 key 拼接 + streamGeminiContent headers 透传 + accessTokenConfig 状态/存储 + ConfigModal 口令字段（Web only）
   - 先写测试：填 Key 直连不带口令头；空 Key Web 走 /api/gemini 带口令头；空 Key 桌面不走代理；缺口令报错文案
   - 验证：`npm test -- runtimeConfig useOcrSession`
3. **文档与运维清单**
   - README：部署 env 说明 + 一键部署按钮参数更新；给用户的轮换清单（撤旧 Key→新 Key→配 GEMINI_API_KEY/ACCESS_TOKEN→删 REACT_APP_GEMINI_API_KEY→重新部署）；`prebuild` 拦截残留 `REACT_APP_GEMINI_API_KEY`
   - 验证：带 `REACT_APP_GEMINI_API_KEY=AIza...` 的 `npm run build` 必须失败；无该变量时 `npm run build` 后 `grep -r "AIza" build/` 无命中（Key 不在产物）
4. **部署验收**（用户配合）
   - Vercel 预览环境配好三变量 → 无口令 curl 401 → 网页填口令识别成功 → 桌面端回归直连
   - 任一失败回到对应步骤

回滚点：步骤 1、2 独立 commit。
评审门：步骤 1 后（curl 实测 401/透传）、步骤 4 前（正式环境切换前确认 Key 已轮换）。
