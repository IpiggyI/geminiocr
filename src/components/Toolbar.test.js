import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from './Toolbar';

const baseProps = {
  onPickFile: jest.fn(),
  onPaste: jest.fn(),
  onToggleUrlInput: jest.fn(),
  onClear: jest.fn(),
  showUrlInput: false,
  translateEnabled: false,
  onToggleTranslate: jest.fn(),
  translateLang: '中文',
  onChangeLang: jest.fn(),
  onOpenConfig: jest.fn(),
  imageUrl: '',
  onImageUrlChange: jest.fn(),
  onUrlSubmit: jest.fn(),
};

test('renders action buttons + settings and wires handlers', () => {
  const onClear = jest.fn();
  const onToggleTranslate = jest.fn();
  render(<Toolbar {...baseProps} onClear={onClear} onToggleTranslate={onToggleTranslate} />);

  expect(screen.getByLabelText('上传')).toBeInTheDocument();
  expect(screen.getByLabelText('粘贴')).toBeInTheDocument();
  expect(screen.getByLabelText('使用链接')).toBeInTheDocument();
  expect(screen.getByLabelText('清除')).toBeInTheDocument();
  expect(screen.getByLabelText('打开设置')).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('清除'));
  expect(onClear).toHaveBeenCalled();

  fireEvent.click(screen.getByRole('switch'));
  expect(onToggleTranslate).toHaveBeenCalled();
});

test('language input only shows when auto-translate is on', () => {
  const { rerender } = render(<Toolbar {...baseProps} translateEnabled={false} />);
  expect(screen.queryByLabelText('目标语言')).not.toBeInTheDocument();

  rerender(<Toolbar {...baseProps} translateEnabled={true} />);
  expect(screen.getByLabelText('目标语言')).toBeInTheDocument();
});

test('url form appears when showUrlInput is true', () => {
  render(<Toolbar {...baseProps} showUrlInput={true} />);
  expect(screen.getByPlaceholderText('请输入图片链接')).toBeInTheDocument();
});
