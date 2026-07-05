import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResultPane } from './ResultPane';

const base = {
  results: [],
  translations: [],
  errors: [],
  translateErrors: [],
  translating: [],
  currentIndex: 0,
  isLoading: false,
  isCorrectingText: false,
  onCancel: jest.fn(),
  onCopy: jest.fn().mockResolvedValue(undefined),
  onCorrect: jest.fn(),
  onRetry: jest.fn(),
  onRetryTranslate: jest.fn(),
};

test('shows only 原文 tab when there is no translation', async () => {
  render(<ResultPane {...base} results={['hello world']} />);

  expect(screen.getByRole('tab', { name: '原文' })).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: /译文/ })).not.toBeInTheDocument();
  expect(await screen.findByText('hello world')).toBeInTheDocument();
});

test('copy button gives state-driven feedback (no querySelector)', async () => {
  const onCopy = jest.fn().mockResolvedValue(undefined);
  render(<ResultPane {...base} results={['abc']} onCopy={onCopy} />);

  fireEvent.click(screen.getByLabelText('复制'));

  expect(onCopy).toHaveBeenCalledWith('abc');
  await waitFor(() => expect(screen.getByText('已复制')).toBeInTheDocument());
});

test('recognition failure renders alert + retry that calls onRetry', () => {
  const onRetry = jest.fn();
  render(<ResultPane {...base} results={['']} errors={['识别失败：boom']} onRetry={onRetry} />);

  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByText('重试识别'));
  expect(onRetry).toHaveBeenCalledWith(0);
});

test('translation tab appears and switches content', async () => {
  render(<ResultPane {...base} results={['orig']} translations={['译文内容']} />);

  const transTab = screen.getByRole('tab', { name: /译文/ });
  fireEvent.click(transTab);

  expect(await screen.findByText('译文内容')).toBeInTheDocument();
});

test('correct button is hidden on the translation tab', () => {
  render(<ResultPane {...base} results={['orig']} translations={['译文']} />);

  expect(screen.getByLabelText('格式纠错')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /译文/ }));
  expect(screen.queryByLabelText('格式纠错')).not.toBeInTheDocument();
});
