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
