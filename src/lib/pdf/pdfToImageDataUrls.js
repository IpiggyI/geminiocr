import { pdfjs } from 'react-pdf';

/**
 * 将 PDF 文件的每一页渲染为 JPEG DataURL
 * @param {File} file - PDF 文件
 * @param {{ scale?: number }} [options]
 * @returns {Promise<string[]>} 每页对应一个 DataURL
 */
export const pdfToImageDataUrls = async (file, { scale = 2.0 } = {}) => {
  pdfjs.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

  const fileReader = new FileReader();
  const pdfData = await new Promise((resolve) => {
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.readAsArrayBuffer(file);
  });

  const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
  const totalPages = pdf.numPages;
  const imageDataUrls = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    try {
      console.log('正在转换第', pageNum, '页为图片');
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;

      imageDataUrls.push(canvas.toDataURL('image/jpeg', 1.0));
    } catch (pageError) {
      console.error(`处理第 ${pageNum} 页时出错:`, pageError);
    }
  }

  return imageDataUrls;
};
