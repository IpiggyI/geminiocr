import { useRef } from 'react';
import { CameraIcon, UploadIcon, PasteIcon, LinkIcon, ClearIcon } from './icons';

/**
 * 上传区（dropzone）。
 * 空态：相机图标 + 提示文案 + 四按钮排（上传/粘贴/链接/清除），点击主体即触发文件选择。
 * 有图态沿用旧「重新上传」结构（左图右文重排属步骤4）。
 */
export function UploadDropzone({
  dropZoneRef,
  isDragging,
  isCompact,
  desktopMode,
  activeDesktopShortcut,
  hasImages,
  onFileChange,
  onPaste,
  onClear,
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
  const fileInputRef = useRef(null);
  const triggerFilePicker = () => fileInputRef.current?.click();
  const subHint = desktopMode
    ? `支持 PNG · JPG · PDF · 快捷键 ${activeDesktopShortcut}`
    : '支持 PNG · JPG · PDF';

  return (
    <div
      ref={dropZoneRef}
      className={`upload-zone ${isDragging ? 'dragging' : ''} ${hasImages ? '' : 'is-empty'}`}
      onDragEnter={!isCompact ? onDragEnter : undefined}
      onDragOver={!isCompact ? onDragOver : undefined}
      onDragLeave={!isCompact ? onDragLeave : undefined}
      onDrop={!isCompact ? onDrop : undefined}
    >
      <input
        id="file-input"
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onFileChange}
        multiple
        hidden
      />

      {hasImages ? (
        <div className="upload-container">
          <label className="upload-button" htmlFor="file-input">
            重新上传
          </label>
          <p className="supported-types">{subHint}</p>
          {!isCompact && (
            <button className="url-button" onClick={onToggleUrlInput}>
              {showUrlInput ? '取消' : '使用链接'}
            </button>
          )}
        </div>
      ) : (
        <>
          <button type="button" className="dropzone-trigger" onClick={triggerFilePicker}>
            <span className="dropzone-icon">
              <CameraIcon />
            </span>
            <span className="dropzone-hint-main">拖拽、点击 或 Ctrl+V 粘贴上传</span>
            <span className="dropzone-hint-sub">{subHint}</span>
          </button>

          <div className="dropzone-actions">
            <label className="btn-pill btn-primary" htmlFor="file-input">
              <UploadIcon />
              <span>上传</span>
            </label>
            <button type="button" className="btn-pill btn-ghost" onClick={onPaste}>
              <PasteIcon />
              <span>粘贴</span>
            </button>
            <button type="button" className="btn-pill btn-ghost" onClick={onToggleUrlInput}>
              <LinkIcon />
              <span>{showUrlInput ? '取消' : '链接'}</span>
            </button>
            <button
              type="button"
              className="btn-pill btn-ghost"
              onClick={onClear}
              disabled={!hasImages}
            >
              <ClearIcon />
              <span>清除</span>
            </button>
          </div>
        </>
      )}

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
