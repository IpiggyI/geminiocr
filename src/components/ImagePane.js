/**
 * 左栏：当前页大图（点击放大）+ 底部缩略图条（横滚、当前页高亮、点击切页）+ 页码。
 */
export function ImagePane({ images, currentIndex, isLoading, onSelect, onImageClick }) {
  return (
    <div className="image-pane">
      <div className={`image-preview ${isLoading ? 'loading' : ''}`}>
        <img
          src={images[currentIndex]}
          alt="预览"
          onClick={onImageClick}
          style={{ cursor: 'pointer' }}
        />
        {isLoading && <div className="loading-overlay" />}
      </div>

      {images.length > 0 && (
        <div className="thumb-strip">
          <div className="thumb-list">
            {images.map((src, i) => (
              <button
                key={i}
                type="button"
                className={`thumb ${i === currentIndex ? 'active' : ''}`}
                aria-label={`第 ${i + 1} 页`}
                aria-current={i === currentIndex ? 'true' : undefined}
                onClick={() => onSelect(i)}
              >
                <img src={src} alt={`第 ${i + 1} 页缩略图`} />
              </button>
            ))}
          </div>
          <span className="thumb-counter">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </div>
  );
}
