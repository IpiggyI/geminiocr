/**
 * 将 File 对象读取为 base64 DataURL 字符串
 * @param {File} file
 * @returns {Promise<string>} dataURL 格式字符串 (data:mime;base64,...)
 */
export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
