import { isTauri } from '../../desktop/tauriBridge';

// Web 端绕过 CORS 的公共代理；桌面端直连，不经过第三方
const PROXY_SERVICES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://proxy.cors.sh/${url}`,
];

const dataUrlToBlob = (dataUrl) => {
  const base64Data = dataUrl.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteArray], { type: 'image/png' });
};

const fetchDirect = async (url) => {
  const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
  const response = await tauriFetch(url);
  if (!response.ok) {
    throw new Error(`图片请求失败 (${response.status})`);
  }
  return response.blob();
};

const fetchViaProxies = async (url) => {
  let lastError;

  for (const getProxyUrl of PROXY_SERVICES) {
    try {
      const response = await fetch(getProxyUrl(url), {
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          'origin': window.location.origin,
        },
      });
      if (!response.ok) throw new Error('Proxy fetch failed');
      return await response.blob();
    } catch (error) {
      lastError = error;
    }
  }

  // 所有代理失败后尝试直接获取（可能拿到 opaque response）
  try {
    const response = await fetch(url, { mode: 'no-cors' });
    return await response.blob();
  } catch (error) {
    throw lastError || error;
  }
};

/**
 * 按运行环境获取图片 Blob：
 * data URL 直接解码；桌面端经 Tauri http 插件直连；Web 端走 CORS 代理链
 */
export const fetchImageBlob = async (url) => {
  if (url.startsWith('data:image/')) return dataUrlToBlob(url);
  if (isTauri()) return fetchDirect(url);
  return fetchViaProxies(url);
};
