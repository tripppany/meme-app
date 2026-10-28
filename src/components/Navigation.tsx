import React from 'react';
import { telegramHaptic } from '../services/telegram';

export type TabType = 'home' | 'editor' | 'gallery' | 'admin';

interface NavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  isAdmin: boolean;
  pendingCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  isAdmin,
  pendingCount,
}) => {
  const handleTabClick = (tab: TabType) => {
    telegramHaptic('light');
    onTabChange(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-800/95 backdrop-blur-md border-t border-slate-700 px-4 py-2">
      <div className="max-w-lg mx-auto flex justify-around items-center">
        <button
          onClick={() => handleTabClick('home')}
          className={`flex flex-col items-center gap-1 transition ${
            currentTab === 'home' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-house text-lg"></i>
          <span className="text-[10px] font-medium">Главная</span>
        </button>

        <button
          onClick={() => handleTabClick('editor')}
          className={`flex flex-col items-center gap-1 transition ${
            currentTab === 'editor' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
          <span className="text-[10px] font-medium">Редактор</span>
        </button>

        <button
          onClick={() => handleTabClick('gallery')}
          className={`flex flex-col items-center gap-1 transition ${
            currentTab === 'gallery' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-images text-lg"></i>
          <span className="text-[10px] font-medium">Галерея</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => handleTabClick('admin')}
            className={`flex flex-col items-center gap-1 transition relative ${
              currentTab === 'admin' ? 'text-amber-400 font-bold' : 'text-amber-500/80 hover:text-amber-400'
            }`}
          >
            <i className="fa-solid fa-shield-halved text-lg"></i>
            <span className="text-[10px] font-medium">Админка</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 right-2 min-w-[14px] h-[14px] bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold px-0.5">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        )}
      </div>
    </nav>
  );
};
