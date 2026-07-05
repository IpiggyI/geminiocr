# 基于Gemini的高精度OCR识别

一个基于 Google Gemini 2.0的高精度 OCR 文字识别应用，支持多国语言和手写字体识别。

## 功能特点

- 🚀 高精度文字识别
- 🌍 支持多国语言识别
- ✍️ 支持手写字体识别
- 🎨 优雅的渐变动画效果
- 📱 响应式设计，支持移动端
- 🖼️ 多种图片输入方式：
  - 文件上传
  - 拖拽上传
  - 粘贴板上传
  - 图片链接上传

## 演示网站
https://ocr.howen.ink/

## 部署说明

本项目使用 Vercel 部署。网页版通过**服务端代理**调用 Gemini：API Key 只存在于服务端环境变量，不再打进前端 bundle；代理由**访问口令**保护，避免端点被匿名滥用。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCiZaii%2Fgeminiocr&env=GEMINI_API_KEY,ACCESS_TOKEN,REACT_APP_GEMINI_API_URL,REACT_APP_GEMINI_MODEL&envDescription=Gemini%20服务端%20Key%20与访问口令&envLink=https%3A%2F%2Fgithub.com%2FCiZaii%2Fgeminiocr%23%E9%83%A8%E7%BD%B2%E8%AF%B4%E6%98%8E&project-name=geminiocr&repository-name=geminiocr&demo-title=Gemini%20OCR&demo-description=基于%20Gemini%20的高精度%20OCR%20文字识别应用&demo-url=https%3A%2F%2Focr.howen.ink&demo-image=https%3A%2F%2Focr.howen.ink%2Fpreview.png)

环境变量说明：

**服务端变量（仅在 Vercel 配置，不会进入前端 bundle）**
- `GEMINI_API_KEY`（必填）：Gemini API Key，由代理端点注入上游请求
- `ACCESS_TOKEN`（必填）：访问口令，网页用户需在设置中填入相同值才能使用内置代理；**未配置时代理直接返回 503**
- `GEMINI_API_URL`（可选）：代理上游基址，默认 `https://generativelanguage.googleapis.com/v1beta`；自定义镜像可照抄 `REACT_APP_GEMINI_API_URL`

**构建期变量（非敏感，可选）**
- `REACT_APP_GEMINI_API_URL`：直连模式默认基址，默认 `https://generativelanguage.googleapis.com/v1beta`
- `REACT_APP_GEMINI_MODEL`：默认模型名，默认 `gemini-2.5-flash`

> ⚠️ 不要再设置 `REACT_APP_GEMINI_API_KEY`——它会被构建期烤入公网 bundle 导致 Key 泄露，已从本项目移除。
> 构建脚本会拦截该变量：如果环境中仍存在 `REACT_APP_GEMINI_API_KEY`，`npm start` / `npm run build` 会直接失败。

网页端解析优先级：
- 页面填了自己的 API Key → 直连 Gemini（不经代理、无需口令）
- 未填 Key → 走服务端代理，自动带访问口令头（需在「设置 → 访问口令」填入 `ACCESS_TOKEN` 同值）

桌面端恒直连，需自备 API Key，不涉及口令与代理。

### API Key 轮换清单

旧版 bundle 已把 Key 公开暴露，视为已泄露，请务必执行：

1. 在 Google AI Studio 撤销/删除旧 Key
2. 生成新的 Gemini API Key
3. Vercel → Settings → Environment Variables：新增 `GEMINI_API_KEY`=新 Key、`ACCESS_TOKEN`=自定义口令，并**删除** `REACT_APP_GEMINI_API_KEY`
4. 重新部署（Redeploy）
5. 将访问口令告知网页使用者，在「设置 → 访问口令」中填入

**注意事项:**
- **需要使用非香港、澳门、大陆地区的网络环境访问**


## 本地开发

### 环境要求

- Node.js 16.x 或更高版本
- npm 或 yarn

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/cokice/googleocr-app.git
cd ocr-app
```

2. 安装依赖
```bash
npm install
# 或
yarn install
```

3. 配置本地默认值（可选）

本地 `npm start` 不带 Vercel 函数，口令代理只在 Vercel 生效。本地识别请在页面「设置」里填入自己的 API Key；如需覆盖非敏感默认值，可创建 `.env.local`（仅本地、不会部署）添加以下配置：
```
REACT_APP_GEMINI_MODEL=gemini-2.5-flash
REACT_APP_GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta
```

4. 启动开发服务器
```bash
npm start
# 或
yarn start
```

访问 http://localhost:3000 即可看到应用。

## 技术栈

- React.js
- Google Gemini Vision API
- CSS3 动画
- React Markdown
- Vercel 部署

## 主要功能

### 图片上传
- 支持拖拽上传
- 支持粘贴上传（包括截图和图片文件）
- 支持图片链接上传
- 支持多图片批量上传

### 文字识别
- 实时流式输出
- 优雅的渐变动画效果
- 支持多国语言
- 支持手写体识别
- 自动优化排版格式

### 结果展示
- 支持 Markdown 格式
- 一键复制识别结果
- 图片预览功能
- 多图片导航切换


## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT License
