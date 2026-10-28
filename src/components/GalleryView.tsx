import React from 'react';
import { MemeItem } from '../types/meme';

interface GalleryViewProps {
  memes: MemeItem[];
  onCreateMemeClick: () => void;
  onDownloadMeme: (meme: MemeItem) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  memes,
  onCreateMemeClick,
  onDownloadMeme,
}) => {
  return (
    <section className="space-y-4 pb-6 animate-in fade-in duration-200">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg flex items-center gap-2 text-white">
          <i className="fa-solid fa-photo-film text-amber-400"></i> Галерея мемов беседы
        </h2>
        <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700/60 font-medium">
          {memes.length} {memes.length === 1 ? 'мем' : memes.length >= 2 && memes.length <= 4 ? 'мема' : 'мемов'}
        </span>
      </div>

      {memes.length === 0 ? (
        <div className="text-center py-16 px-4 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800/80">
          <i className="fa-solid fa-face-meh text-5xl mb-3 block text-slate-600"></i>
          <p className="text-sm font-medium text-slate-300 mb-1">
            В галерее пока нет одобренных мемов
          </p>
          <p className="text-xs text-slate-500 mb-6">
            Будь первым, кто создаст и опубликует свой мем!
          </p>
          <button
            onClick={onCreateMemeClick}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <i className="fa-solid fa-wand-magic-sparkles mr-1.5"></i> Создать мем
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {memes.map((meme) => (
            <div
              key={meme.id}
              className="bg-slate-800 border border-slate-700/80 rounded-2xl p-3 flex flex-col gap-3 shadow-lg hover:border-slate-600 transition"
            >
              <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/60 aspect-square">
                <img
                  src={meme.dataUrl}
                  alt={`Meme by ${meme.author}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="truncate pr-2">
                  {meme.isAnonymous ? (
                    <span className="flex items-center gap-1 font-bold text-amber-400">
                      <i className="fa-solid fa-user-secret text-xs"></i>
                      <span>Аноним</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-slate-400">Автор: </span>
                      <span className="font-bold text-indigo-300">{meme.author}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onDownloadMeme(meme)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium flex items-center justify-center transition active:scale-95"
                    title="Скачать мем"
                  >
                    <i className="fa-solid fa-download"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
