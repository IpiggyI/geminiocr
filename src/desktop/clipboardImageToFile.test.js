jest.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  readImage: jest.fn(),
}));

import { readImage } from '@tauri-apps/plugin-clipboard-manager';
import { clipboardImageToFile } from './clipboardImageToFile';

describe('clipboardImageToFile', () => {
  let createElementSpy;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    jest.clearAllMocks();
    window.__TAURI_INTERNALS__ = {};
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { read: jest.fn() },
    });

    global.ImageData = class {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };

    createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: jest.fn(() => ({
            putImageData: jest.fn(),
          })),
          toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' })),
        };
      }

      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    delete window.__TAURI_INTERNALS__;
    createElementSpy.mockRestore();
    delete global.ImageData;
  });

  test('returns file when tauri clipboard image is available', async () => {
    readImage.mockResolvedValue({
      size: jest.fn().mockResolvedValue({ width: 1, height: 1 }),
      rgba: jest.fn().mockResolvedValue(new Uint8Array([0, 0, 0, 255])),
    });

    const result = await clipboardImageToFile();

    expect(result.status).toBe('success');
    expect(result.file).toBeInstanceOf(File);
    expect(result.source).toBe('tauri');
  });

  test('returns empty status when clipboard has no image', async () => {
    readImage.mockRejectedValue(new Error('The clipboard contents were not available in the requested format or the clipboard is empty.'));
    window.navigator.clipboard.read.mockResolvedValue([
      {
        types: ['text/plain'],
      },
    ]);

    const result = await clipboardImageToFile();

    expect(result.status).toBe('empty');
    expect(result.file).toBeNull();
  });

  test('returns error status when clipboard read fails', async () => {
    readImage.mockRejectedValue(new Error('The native clipboard is not accessible due to being held by another party.'));
    window.navigator.clipboard.read.mockRejectedValue(new Error('browser clipboard blocked'));

    const result = await clipboardImageToFile();

    expect(result.status).toBe('error');
    expect(result.message).toMatch(/读取剪贴板图片失败/);
  });
});
