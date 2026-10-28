import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-11/12 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bg =
    toast.type === 'success'
      ? 'bg-emerald-600/95 border-emerald-500 shadow-emerald-900/30'
      : toast.type === 'error'
      ? 'bg-rose-600/95 border-rose-500 shadow-rose-900/30'
      : 'bg-indigo-600/95 border-indigo-500 shadow-indigo-900/30';

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between px-4 py-2.5 rounded-xl border shadow-lg text-white text-xs font-semibold backdrop-blur-md transition transform animate-in fade-in slide-in-from-top-2 ${bg}`}
    >
      <div className="flex items-center gap-2">
        {toast.type === 'success' && <i className="fa-solid fa-circle-check text-sm"></i>}
        {toast.type === 'error' && <i className="fa-solid fa-circle-exclamation text-sm"></i>}
        {toast.type === 'info' && <i className="fa-solid fa-circle-info text-sm"></i>}
        <span>{toast.text}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-3 text-white/80 hover:text-white p-1"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
};
