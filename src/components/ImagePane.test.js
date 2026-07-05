import { render, screen, fireEvent } from '@testing-library/react';
import { ImagePane } from './ImagePane';

test('renders thumbnails + page counter and selects on click', () => {
  const onSelect = jest.fn();
  render(
    <ImagePane
      images={['a.png', 'b.png', 'c.png']}
      currentIndex={0}
      isLoading={false}
      onSelect={onSelect}
      onImageClick={() => {}}
    />
  );

  expect(screen.getByText('1 / 3')).toBeInTheDocument();
  expect(screen.getByLabelText('第 1 页')).toHaveClass('active');

  fireEvent.click(screen.getByLabelText('第 2 页'));
  expect(onSelect).toHaveBeenCalledWith(1);
});
