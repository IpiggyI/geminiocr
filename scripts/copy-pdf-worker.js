// 把与 react-pdf 版本一致的 pdf.js worker 拷进 public/，避免运行时依赖 CDN
const fs = require('fs');
const path = require('path');

const source = require.resolve('pdfjs-dist/build/pdf.worker.min.js');
const target = path.join(__dirname, '..', 'public', 'pdf.worker.min.js');

fs.copyFileSync(source, target);
console.log(`Copied pdf.worker.min.js -> ${path.relative(process.cwd(), target)}`);
