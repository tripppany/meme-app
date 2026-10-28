import React from 'react';
import { MemeTemplate } from '../types/meme';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MemeTemplate[];
  onSelectTemplate: (template: MemeTemplate) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/90">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-shapes text-amber-400"></i>
            <h3 className="font-bold text-white text-base">Шаблоны беседы</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center justify-center transition"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-2 gap-3 max-h-[70vh]">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="group bg-slate-900 border border-slate-700/80 hover:border-indigo-500 rounded-xl p-2 cursor-pointer transition flex flex-col items-center gap-2 active:scale-95"
            >
              <div className="w-full h-28 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center p-1 border border-slate-800/50">
                <img
                  src={template.url}
                  alt={template.title}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-200"
                />
              </div>
              <span className="text-xs font-semibold text-slate-200 text-center truncate w-full group-hover:text-indigo-300">
                {template.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
