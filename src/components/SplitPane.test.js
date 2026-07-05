import { render, screen } from '@testing-library/react';
import { SplitPane, resolveInitialPct, clampPct } from './SplitPane';

describe('SplitPane helpers', () => {
  test('resolveInitialPct falls back on invalid / out-of-range', () => {
    expect(resolveInitialPct('45', 38)).toBe(45);
    expect(resolveInitialPct(null, 38)).toBe(38);
    expect(resolveInitialPct('5', 38)).toBe(38);   // < 10
    expect(resolveInitialPct('95', 38)).toBe(38);  // > 90
    expect(resolveInitialPct('abc', 38)).toBe(38);
  });

  test('clampPct honors left/right min pixels', () => {
    // 宽 1000：左 min260→26%，右 min360→左≤64%
    expect(clampPct(50, 1000, 260, 360)).toBe(50);
    expect(clampPct(10, 1000, 260, 360)).toBe(26);
    expect(clampPct(80, 1000, 260, 360)).toBe(64);
  });

  test('clampPct returns midpoint when container too narrow', () => {
    // 宽 500：lo=52 > hi=28 → 取中点 40
    expect(clampPct(50, 500, 260, 360)).toBe(40);
  });
});

describe('SplitPane render', () => {
  beforeEach(() => window.localStorage.clear());

  test('renders two panels and a draggable divider', () => {
    window.localStorage.setItem('geminiocr-split-ratio', '50');
    render(
      <SplitPane>
        <div>LEFT</div>
        <div>RIGHT</div>
      </SplitPane>
    );
    expect(screen.getByText('LEFT')).toBeInTheDocument();
    expect(screen.getByText('RIGHT')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  test('disabled renders stacked layout without divider', () => {
    render(
      <SplitPane disabled>
        <div>L</div>
        <div>R</div>
      </SplitPane>
    );
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});
