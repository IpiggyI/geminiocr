import { isTauri } from './tauriBridge';

/**
 * 从系统剪贴板读取图片并转换为 PNG File 对象
 * 仅在 Tauri 桌面端可用；Web 环境返回 null
 *
 * @returns {Promise<File | null>}
 */
export const clipboardImageToFile = async () => {
  if (!isTauri()) return null;

  try {
    const { readImage } = await import('@tauri-apps/plugin-clipboard-manager');
    const imageData = await readImage();

    if (!imageData) return null;

    // Tauri clipboard readImage 返回的是 Image 对象，包含 rgba() 和宽高
    // 需要转换为 PNG blob
    const rgba = await imageData.rgba();
    const width = imageData.width;
    const height = imageData.height;

    // 使用 Canvas 将 RGBA 数据转为 PNG
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = new ImageData(new Uint8ClampedArray(rgba), width, height);
    ctx.putImageData(imgData, 0, 0);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );

    if (!blob) return null;
    return new File([blob], 'clipboard.png', { type: 'image/png' });
  } catch (error) {
    console.error('读取剪贴板图片失败:', error);
    return null;
  }
};
