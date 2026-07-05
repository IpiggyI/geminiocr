import { CameraIcon, UploadIcon, PasteIcon, LinkIcon, ClearIcon } from './icons';

/**
 * 空态上传区（dropzone）：相机图标 + 提示文案 + 四按钮排（上传/粘贴/链接/清除）。
 * 点击主体或「上传」触发文件选择（picker 由 App 持有）。有图态改由 Toolbar 承接（步骤4）。
 */
export function UploadDropzone({
  dropZoneRef,
  isDragging,
  isCompact,
  desktopMode,
  activeDesktopShortcut,
  onPickFile,
  onPaste,
  showUrlInput,
  onToggleUrlInput,
  imageUrl,
  onImageUrlChange,
  onUrlSubmit,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const subHint = desktopMode
    ? `支持 PNG · JPG · PDF · 快捷键 ${activeDesktopShortcut}`
    : '支持 PNG · JPG · PDF';

  return (
    <div
      ref={dropZoneRef}
      className={`upload-zone is-empty ${isDragging ? 'dragging' : ''}`}
      onDragEnter={!isCompact ? onDragEnter : undefined}
      onDragOver={!isCompact ? onDragOver : undefined}
      onDragLeave={!isCompact ? onDragLeave : undefined}
      onDrop={!isCompact ? onDrop : undefined}
    >
      <button type="button" className="dropzone-trigger" onClick={onPickFile}>
        <span className="dropzone-icon">
          <CameraIcon />
        </span>
        <span className="dropzone-hint-main">拖拽、点击 或 Ctrl+V 粘贴上传</span>
        <span className="dropzone-hint-sub">{subHint}</span>
      </button>

      <div className="dropzone-actions">
        <button type="button" className="btn-pill btn-primary" onClick={onPickFile}>
          <UploadIcon />
          <span>上传</span>
        </button>
        <button type="button" className="btn-pill btn-ghost" onClick={onPaste}>
          <PasteIcon />
          <span>粘贴</span>
        </button>
        <button type="button" className="btn-pill btn-ghost" onClick={onToggleUrlInput}>
          <LinkIcon />
          <span>{showUrlInput ? '取消' : '链接'}</span>
        </button>
        {/* 空态无内容可清，「清除」始终禁用（有图态由 Toolbar 提供可用的清除） */}
        <button type="button" className="btn-pill btn-ghost" disabled>
          <ClearIcon />
          <span>清除</span>
        </button>
      </div>

      {showUrlInput && (
        <form onSubmit={onUrlSubmit} className="url-form">
          <input
            type="url"
            value={imageUrl}
            onChange={onImageUrlChange}
            placeholder="请输入图片链接"
            className="url-input"
          />
          <button type="submit" className="url-submit">
            确认
          </button>
        </form>
      )}
    </div>
  );
}
