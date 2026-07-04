import { act, render, screen } from '@testing-library/react';
import { ToastHost, toast } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows message when toast is emitted', () => {
    render(<ToastHost />);

    act(() => {
      toast('剪贴板中没有图片');
    });

    expect(screen.getByText('剪贴板中没有图片')).toBeInTheDocument();
  });

  test('auto dismisses after duration', () => {
    render(<ToastHost />);

    act(() => {
      toast('稍纵即逝', { duration: 1000 });
    });
    expect(screen.getByText('稍纵即逝')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(screen.queryByText('稍纵即逝')).not.toBeInTheDocument();
  });

  test('applies error variant class', () => {
    render(<ToastHost />);

    act(() => {
      toast('出错了', { type: 'error' });
    });

    expect(screen.getByText('出错了')).toHaveClass('toast--error');
  });
});
