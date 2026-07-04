import { useEffect, useState } from 'react';

let listeners = [];
let nextId = 1;

/**
 * 发送一条非阻塞提示，替代 alert()
 * 任意模块（含非 React 代码）均可调用；需要页面挂载 <ToastHost />
 */
export const toast = (message, { type = 'info', duration = 4000 } = {}) => {
  const item = { id: nextId++, message, type, duration };
  listeners.forEach((listener) => listener(item));
};

export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const timers = new Set();
    const listener = (item) => {
      setToasts((prev) => [...prev, item]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, item.duration);
      timers.add(timer);
    };

    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}
