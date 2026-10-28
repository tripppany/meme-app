import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  isDanger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-xs rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-center">
        <div
          className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
            isDanger ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
          }`}
        >
          <i
            className={`fa-solid ${
              isDanger ? 'fa-triangle-exclamation text-xl' : 'fa-circle-question text-xl'
            }`}
          ></i>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-300 transition active:scale-95 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-md ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
