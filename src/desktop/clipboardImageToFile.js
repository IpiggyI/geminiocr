import { isTauri } from './tauriBridge';

const EMPTY_CLIPBOARD_PATTERN = /requested format|clipboard is empty|content not available/i;

const imageDataToFile = async (imageData) => {
  const rgba = await imageData.rgba();
  const size = typeof imageData.size === 'function'
    ? await imageData.size()
    : { width: imageData.width, height: imageData.height };
  const width = size.width;
  const height = size.height;

  const canvas = document.createElement('canvas');
  if (!canvas.getContext || !canvas.toBlob) {
    return new File([rgba], 'clipboard.png', { type: 'image/png' });
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  ctx.putImageData(imgData, 0, 0);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) return null;
  return new File([blob], 'clipboard.png', { type: 'image/png' });
};

const readTauriClipboardImage = async () => {
  const { readImage } = await import('@tauri-apps/plugin-clipboard-manager');
  const imageData = await readImage();

  if (!imageData) return null;
  return imageDataToFile(imageData);
};

const readBrowserClipboardImage = async () => {
  if (!navigator.clipboard?.read) return null;

  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith('image/'));
    if (!imageType) continue;

    const blob = await item.getType(imageType);
    return new File([blob], 'clipboard.png', { type: blob.type || imageType });
  }

  return null;
};

/**
 * 从系统剪贴板读取图片并转换为 PNG File 对象
 * 仅在 Tauri 桌面端可用；Web 环境返回 null
 *
 * @returns {Promise<{ status: 'success' | 'empty' | 'error' | 'unsupported', file: File | null, message?: string, source?: 'tauri' | 'browser' }>}
 */
export const clipboardImageToFile = async () => {
  if (!isTauri()) {
    return {
      status: 'unsupported',
      file: null,
      message: '当前不是桌面端环境',
    };
  }

  let tauriError = null;
  try {
    const tauriFile = await readTauriClipboardImage();
    if (tauriFile) {
      return { status: 'success', file: tauriFile, source: 'tauri' };
    }
  } catch (error) {
    tauriError = error;
  }

  try {
    const browserFile = await readBrowserClipboardImage();
    if (browserFile) {
      return { status: 'success', file: browserFile, source: 'browser' };
    }
  } catch (error) {
    const detail = tauriError ? `${tauriError.message}; ${error.message}` : error.message;
    console.error('读取剪贴板图片失败:', detail);
    return {
      status: 'error',
      file: null,
      message: `读取剪贴板图片失败，请重新截图后重试 (${detail})`,
    };
  }

  if (tauriError && !EMPTY_CLIPBOARD_PATTERN.test(tauriError.message || '')) {
    console.error('读取剪贴板图片失败:', tauriError);
    return {
      status: 'error',
      file: null,
      message: `读取剪贴板图片失败，请重新截图后重试 (${tauriError.message})`,
    };
  }

  return {
    status: 'empty',
    file: null,
    message: '剪贴板中没有图片，请先截图或复制图片',
  };
};
