import { useState, useRef, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'geminiocr-split-ratio';

/** 读取持久化比例；非法值回落到初始值 */
export const resolveInitialPct = (saved, initial) => {
  const n = Number(saved);
  return Number.isFinite(n) && n >= 10 && n <= 90 ? n : initial;
};

/** 按左右最小像素把百分比钳制到合法区间；容器过窄时取中点 */
export const clampPct = (pct, width, minLeft, minRight) => {
  if (!width) return pct;
  const lo = (minLeft / width) * 100;
  const hi = 100 - (minRight / width) * 100;
  if (lo >= hi) return (lo + hi) / 2;
  return Math.min(hi, Math.max(lo, pct));
};

/**
 * 自实现左右可拖分隔条（不引库）。
 * children 需为恰好两个节点：[左, 右]。disabled 时退化为纵向堆叠（紧凑态）。
 */
export function SplitPane({
  children,
  storageKey = STORAGE_KEY,
  minLeft = 260,
  minRight = 360,
  initial = 38,
  disabled = false,
}) {
  const [left, right] = children;
  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const pctRef = useRef(38);
  const [pct, setPct] = useState(() =>
    resolveInitialPct(typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null, initial)
  );
  pctRef.current = pct;

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const raw = ((e.clientX - rect.left) / rect.width) * 100;
    setPct(clampPct(raw, rect.width, minLeft, minRight));
  }, [minLeft, minRight]);

  const stopDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.localStorage.setItem(storageKey, String(Math.round(pctRef.current)));
  }, [storageKey]);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopDrag);
    };
  }, [onPointerMove, stopDrag]);

  const startDrag = () => {
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  if (disabled) {
    return (
      <div className="split-pane split-pane--stacked" ref={containerRef}>
        <div className="split-pane__panel">{left}</div>
        <div className="split-pane__panel">{right}</div>
      </div>
    );
  }

  return (
    <div className="split-pane" ref={containerRef}>
      <div className="split-pane__panel" style={{ width: `${pct}%` }}>{left}</div>
      <div
        className="split-pane__divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调整左右比例"
        onPointerDown={startDrag}
      />
      <div className="split-pane__panel split-pane__panel--right">{right}</div>
    </div>
  );
}
