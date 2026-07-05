/**
 * 图片预览区：页码导航 + 当前页大图。
 * 步骤 2 为纯结构搬运，className / 行为与原 App 内联实现保持一致。
 */
export function ImagePane({ images, currentIndex, isLoading, onPrev, onNext, onImageClick }) {
  return (
    <div className="images-preview">
      <div className="image-navigation">
        <button onClick={onPrev} disabled={currentIndex === 0} className="nav-button">
          ←
        </button>
        <span className="image-counter">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onNext}
          disabled={currentIndex === images.length - 1}
          className="nav-button"
        >
          →
        </button>
      </div>
      <div className={`image-preview ${isLoading ? 'loading' : ''}`}>
        <img
          src={images[currentIndex]}
          alt="预览"
          onClick={onImageClick}
          style={{ cursor: 'pointer' }}
        />
        {isLoading && <div className="loading-overlay" />}
      </div>
    </div>
  );
}
