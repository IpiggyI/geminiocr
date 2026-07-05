/**
 * 上传区（dropzone）：文件按钮、支持格式提示、链接输入、拖放提示。
 * 步骤 2 为纯结构搬运，className / 行为与原 App 内联实现保持一致。
 */
export function UploadDropzone({
  dropZoneRef,
  isDragging,
  isCompact,
  desktopMode,
  activeDesktopShortcut,
  hasImages,
  onFileChange,
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
  return (
    <div
      ref={dropZoneRef}
      className={`upload-zone ${isDragging ? 'dragging' : ''}`}
      onDragEnter={!isCompact ? onDragEnter : undefined}
      onDragOver={!isCompact ? onDragOver : undefined}
      onDragLeave={!isCompact ? onDragLeave : undefined}
      onDrop={!isCompact ? onDrop : undefined}
    >
      <div className="upload-container">
        <label className="upload-button" htmlFor="file-input">
          {hasImages ? '重新上传' : '上传文件'}
        </label>
        <p className="supported-types">
          {desktopMode
            ? `支持的格式：PNG、JPG、PDF | 快捷键：${activeDesktopShortcut}`
            : '支持的格式：PNG、JPG、PDF'}
        </p>
        <input
          id="file-input"
          type="file"
          accept="image/*,application/pdf"
          onChange={onFileChange}
          multiple
          hidden
        />
        {!isCompact && (
          <button className="url-button" onClick={onToggleUrlInput}>
            {showUrlInput ? '取消' : '使用链接'}
          </button>
        )}
      </div>

      {showUrlInput && !isCompact && (
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

      {!hasImages && !showUrlInput && !isCompact && (
        <p className="upload-hint">或将图片拖放到此处</p>
      )}
    </div>
  );
}
