jest.mock('@tauri-apps/plugin-http', () => ({ fetch: jest.fn() }));

import { fetchImageBlob } from './fetchImageBlob';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

describe('fetchImageBlob', () => {
  afterEach(() => {
    delete window.__TAURI_INTERNALS__;
    delete global.fetch;
    jest.clearAllMocks();
  });

  test('decodes data url without network', async () => {
    global.fetch = jest.fn();

    const blob = await fetchImageBlob('data:image/png;base64,aGVsbG8=');

    expect(blob.type).toBe('image/png');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('uses direct tauri fetch on desktop without proxies', async () => {
    window.__TAURI_INTERNALS__ = {};
    const okBlob = new Blob(['x'], { type: 'image/jpeg' });
    tauriFetch.mockResolvedValue({ ok: true, blob: async () => okBlob });
    global.fetch = jest.fn();

    const blob = await fetchImageBlob('https://example.com/a.jpg');

    expect(tauriFetch).toHaveBeenCalledWith('https://example.com/a.jpg');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(blob).toBe(okBlob);
  });

  test('falls through proxy chain on web until one succeeds', async () => {
    const okBlob = new Blob(['x'], { type: 'image/png' });
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('proxy1 down'))
      .mockResolvedValueOnce({ ok: true, blob: async () => okBlob });

    const blob = await fetchImageBlob('https://example.com/a.jpg');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(blob).toBe(okBlob);
  });
});
