// 集中导出内联 SVG 图标（沿用应用既有设计语言）

/** 设置齿轮 */
export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.325 4.317a1 1 0 0 1 1.35-.936l.664.286a1 1 0 0 0 .79 0l.664-.286a1 1 0 0 1 1.35.936l.081.72a1 1 0 0 0 .596.804l.663.287a1 1 0 0 1 .55 1.31l-.286.663a1 1 0 0 0 0 .79l.286.663a1 1 0 0 1-.55 1.31l-.663.287a1 1 0 0 0-.596.804l-.081.72a1 1 0 0 1-1.35.936l-.664-.286a1 1 0 0 0-.79 0l-.664.286a1 1 0 0 1-1.35-.936l-.081-.72a1 1 0 0 0-.596-.804l-.663-.287a1 1 0 0 1-.55-1.31l.286-.663a1 1 0 0 0 0-.79l-.286-.663a1 1 0 0 1 .55-1.31l.663-.287a1 1 0 0 0 .596-.804l.081-.72z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** 空态相机（渐变描边；尺寸由 CSS 控制） */
export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="url(#camera-grad)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <defs>
        <linearGradient id="camera-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0071e3" />
          <stop offset="1" stopColor="#6200ff" />
        </linearGradient>
      </defs>
      <path d="M3 8.5A2 2 0 0 1 5 6.5h1.3l.9-1.45A1.5 1.5 0 0 1 8.45 4.3h3.1a1.5 1.5 0 0 1 1.25.75l.9 1.45H19a2 2 0 0 1 2 2v8A2 2 0 0 1 19 18.5H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.8" r="3.1" />
    </svg>
  );
}

/** 上传（箭头入托盘） */
export function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

/** 粘贴（剪贴板） */
export function PasteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
    </svg>
  );
}

/** 链接（链条） */
export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 14.5l5-5" />
      <path d="M11.5 6.5l1-1a4 4 0 0 1 5.7 5.7l-2 2" />
      <path d="M12.5 17.5l-1 1a4 4 0 0 1-5.7-5.7l2-2" />
    </svg>
  );
}

/** 清除（叉） */
export function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** 复制 */
export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** 对勾（复制成功） */
export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** 格式纠错（魔法棒） */
export function CorrectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 4V2M15 10V8M12.5 5.5h-2M19.5 5.5h-2M5 20l9-9M13 6l4 4" />
    </svg>
  );
}

/** 重试（环形箭头） */
export function RetryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
    </svg>
  );
}

/** 翻译（A→文） */
export function TranslateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 5h7M6.5 5v11M10 8c0 4.5-3.5 8.5-7 8.5M4.5 11.5c2 2 5 2.5 7.5 0" />
      <path d="M13 20l3.5-9L20 20M14 17.5h5" />
    </svg>
  );
}

/** 返回（左箭头） */
export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/** 显示密码（睁眼） */
export function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** 隐藏密码（闭眼） */
export function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.9 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a13.7 13.7 0 0 1-2.16 2.88M6.5 6.5C3.5 8.2 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.5-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
