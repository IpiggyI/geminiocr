import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders app heading', () => {
  render(<App />);
  const heading = screen.getByText(/OCR/i);
  expect(heading).toBeInTheDocument();
});

test('opens api config modal and shows environment fallbacks', () => {
  render(<App />);

  fireEvent.click(screen.getByLabelText('打开 API 配置'));

  expect(screen.getByText('Gemini API 配置')).toBeInTheDocument();
  expect(screen.getByText('https://generativelanguage.googleapis.com/v1beta')).toBeInTheDocument();
  expect(screen.getByText('gemini-2.5-flash')).toBeInTheDocument();
});
