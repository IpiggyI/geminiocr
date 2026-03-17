/**
 * 将 DataURL 字符串转换为 File 对象
 * @param {string} dataUrl - base64 DataURL
 * @param {string} fileName - 文件名
 * @param {string} [mimeType] - MIME 类型，默认从 dataUrl 解析
 * @returns {Promise<File>}
 */
export const dataUrlToFile = async (dataUrl, fileName, mimeType) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const type = mimeType || blob.type;
  return new File([blob], fileName, { type });
};
