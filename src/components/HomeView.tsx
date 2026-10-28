import React, { useRef } from 'react';
import { MemeItem } from '../types/meme';

interface HomeViewProps {
  onOpenTemplateSelector: () => void;
  onUploadCustomMeme: (dataUrl: string) => void;
  approvedCount: number;
  pendingCount: number;
  recentMemes: MemeItem[];
  onSelectMemeForViewing: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenTemplateSelector,
  onUploadCustomMeme,
  approvedCount,
  pendingCount,
  recentMemes,
  onSelectMemeForViewing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onUploadCustomMeme(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <section className="flex flex-col justify-center items-center text-center my-auto py-4 space-y-6 animate-in fade-in duration-200">
      <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 transform hover:scale-105 transition">
        <i className="fa-solid fa-wand-magic-sparkles text-4xl text-slate-900"></i>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Создай ухахатбл мем!</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Выбирай готовые шаблоны или загружай свою картинку.
        </p>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={onOpenTemplateSelector}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-between transition active:scale-95 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <i className="fa-solid fa-images text-xl text-indigo-200"></i>
            <span className="text-base">Выбрать шаблон</span>
          </div>
          <i className="fa-solid fa-chevron-right text-indigo-300"></i>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 flex items-center justify-between transition active:scale-95 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <i className="fa-solid fa-cloud-arrow-up text-xl text-amber-400"></i>
            <span className="text-base">Загрузить свой мем</span>
          </div>
          <i className="fa-solid fa-plus text-slate-400"></i>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Stats Counter */}
      <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 w-full flex justify-around text-center shadow-md">
        <div className="flex-1">
          <div className="text-2xl font-black text-amber-400">{approvedCount}</div>
          <div className="text-xs text-slate-400 font-medium">Опубликовано</div>
        </div>
        <div className="border-r border-slate-700"></div>
        <div className="flex-1">
          <div className="text-2xl font-black text-indigo-400">{pendingCount}</div>
          <div className="text-xs text-slate-400 font-medium">На проверке</div>
        </div>
      </div>

      {/* Preview of latest meme if any */}
      {recentMemes.length > 0 && (
        <div className="w-full pt-2">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-xs font-semibold text-slate-400">Свежий мем из беседы:</span>
            <button
              onClick={onSelectMemeForViewing}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              В галерею &rarr;
            </button>
          </div>
          <div
            onClick={onSelectMemeForViewing}
            className="cursor-pointer bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700 hover:border-slate-600 transition flex items-center gap-3"
          >
            <div className="w-16 h-16 rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={recentMemes[0].dataUrl}
                alt="Latest meme"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-xs font-bold text-white truncate">
                Автор: <span className="text-amber-400">{recentMemes[0].author}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Нажми, чтобы посмотреть все мемы беседы
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
