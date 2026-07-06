# 设计：服务端 Key + 口令保护流式代理

## 代理端点

`api/gemini.js`（Vercel Node 固定路由；`vercel.json` 把 `/api/gemini/(.*)` rewrite 为 `?__path=$1`）：

```
POST /api/gemini/models/<model>:streamGenerateContent?alt=sse
  headers: x-access-token: <口令>
  body: 前端现有 Gemini 请求体原样
```

处理流程：
1. 非 POST → 405；`!process.env.ACCESS_TOKEN` → 503；`req.headers['x-access-token'] !== ACCESS_TOKEN` → 401
2. 目标 URL = `(process.env.GEMINI_API_URL || 官方 /v1beta 基址)` + `__path` + query（剥掉客户端可能传入的 key 参数），服务端注入 `?key=process.env.GEMINI_API_KEY`（与直连同构，兼容只认 query key 的自定义镜像）
3. `fetch` 转发，`response.body` 直接 pipe 给 `res`（SSE 透传，逐 chunk flush）；上游非 2xx 原样透传状态与 body

不做任何格式转换——前端 SSE 解析零改动。旧 `api/recognize*.js` 三文件删除，`@google/generative-ai` 依赖移除。

## 前端改动

- `runtimeConfig.js`：`resolveConfig` 增加代理分支——
  - `apiKeyConfig` 非空 → 直连（现逻辑，不变）
  - 空 且 `isTauri()` → 抛缺 Key 引导（桌面端不走代理）
  - 空 且 Web → 返回 `{ mode: 'proxy', apiUrl: '/api/gemini', accessToken }`；缺口令时抛"缺少访问口令"错误（复用缺 Key 引导通道）
- `buildGeminiEndpoint`：proxy 模式不拼 `key=` 参数
- `streamGeminiContent`：接受可选 `headers` 透传（口令头）；解析逻辑不动
- 口令存储：`geminiocr-access-token`（localStorage），useOcrSession 增加 `accessTokenConfig` 状态，写入模式同现有三项
- ConfigModal（或第三批后的 SettingsView）API 组：Web 端（`!isTauri()`）渲染"访问口令"密码框（带可见性切换，与 Key 一致）

## 环境变量收敛（README 部署说明同步）

| 变量 | 位置 | 用途 |
|---|---|---|
| `GEMINI_API_KEY` | Vercel 服务端 | 代理注入 |
| `GEMINI_API_URL` | Vercel 服务端（可选） | 代理上游基址，默认含 `/v1beta`，可照抄 `REACT_APP_GEMINI_API_URL` |
| `ACCESS_TOKEN` | Vercel 服务端 | 口令 |
| `REACT_APP_GEMINI_API_URL/MODEL` | 构建期（可留） | 非敏感默认值 |
| ~~`REACT_APP_GEMINI_API_KEY`~~ | 移除 | 不再进 bundle |

`scripts/check-env-safety.js` 接入 `prestart` / `prebuild`，构建环境仍存在 `REACT_APP_GEMINI_API_KEY` 时直接失败；这是必要防线，因为 CRA 会把所有 `REACT_APP_*` 注入前端环境对象。

README 一键部署按钮的 env 参数列表同步改。

## 兼容性

- 桌面端：isTauri 分支恒直连（实际不会发 /api 请求）
- 本地 dev（npm start 无 Vercel 函数）：代理模式 fetch /api 404 → 报错提示"本地开发请在设置中填入 Key"；不做本地 mock

## 回滚

单任务两 commit：① 代理端点 + 旧函数删除；② 前端代理模式接入。revert ② 即回退为"必须手填 Key"，不重新引入暴露。
