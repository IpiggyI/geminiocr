import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

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
