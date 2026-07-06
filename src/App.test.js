import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('./lib/pdf/pdfToImageDataUrls', () => ({ pdfToImageDataUrls: jest.fn() }));

import App from './App';
import { pdfToImageDataUrls } from './lib/pdf/pdfToImageDataUrls';

test('renders app heading', () => {
  render(<App />);
  const heading = screen.getByText(/OCR/i);
  expect(heading).toBeInTheDocument();
});

test('empty state renders four action buttons with clear disabled', () => {
  render(<App />);

  expect(screen.getByText('上传')).toBeInTheDocument();
  expect(screen.getByText('粘贴')).toBeInTheDocument();
  expect(screen.getByText('链接')).toBeInTheDocument();

  // 空态无内容可清，「清除」禁用
  expect(screen.getByText('清除').closest('button')).toBeDisabled();
});

test('link button toggles inline url input in empty state', () => {
  render(<App />);

  expect(screen.queryByPlaceholderText('请输入图片链接')).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('链接'));

  expect(screen.getByPlaceholderText('请输入图片链接')).toBeInTheDocument();
});

test('opens settings view and shows environment fallbacks', () => {
  render(<App />);

  fireEvent.click(screen.getByLabelText('打开设置'));

  expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument();
  expect(screen.getByLabelText('API Key')).toBeInTheDocument();
  expect(screen.getByText(/环境变量（https:\/\/generativelanguage\.googleapis\.com\/v1beta）/)).toBeInTheDocument();
  expect(screen.getByText(/环境变量（gemini-2\.5-flash）/)).toBeInTheDocument();
});

test('compact empty state keeps the settings entry available', () => {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));

  try {
    render(<App />);
    expect(screen.getByLabelText('打开设置')).toBeVisible();
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});

test('dropped PDF routes through uploadFiles and shows the svg placeholder', async () => {
  // 转换挂起，占位缩略图保持可见；旧拖拽路径会给 PDF 一个裂图的 blob 预览
  pdfToImageDataUrls.mockReturnValue(new Promise(() => {}));
  const { container } = render(<App />);

  const pdf = new File(['pdf'], 'demo.pdf', { type: 'application/pdf' });
  fireEvent.drop(container.querySelector('.upload-zone'), {
    dataTransfer: { items: [{ kind: 'file', getAsFile: () => pdf }] },
  });

  const thumb = await screen.findByAltText('第 1 页缩略图');
  expect(thumb.src).toMatch(/^data:image\/svg\+xml/);
});
