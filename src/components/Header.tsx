import React, { useRef } from 'react';
import { TelegramUser } from '../types/meme';

interface HeaderProps {
  isAdmin: boolean;
  onToggleAdmin: () => void;
  user: TelegramUser;
}

export const Header: React.FC<HeaderProps> = ({ isAdmin, onToggleAdmin, user }) => {
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);

  const handleTitleClick = () => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, 2500);

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      onToggleAdmin();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-800/90 backdrop-blur-md border-b border-slate-700 px-4 py-3 flex justify-between items-center shadow-md">
      <div
        className="flex items-center space-x-2 cursor-pointer select-none active:scale-95 transition"
        onClick={handleTitleClick}
        title="Нажми 5 раз для входа в режим администратора"
      >
        <i className="fa-solid fa-face-laugh-squint text-amber-400 text-2xl animate-pulse"></i>
        <div className="flex flex-col">
          <h1 className="font-extrabold text-lg tracking-wide text-white flex items-center gap-1.5">
            ураа мемы
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && (
          <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
            <i className="fa-solid fa-shield-halved text-[9px]"></i>
            Админ
          </span>
        )}
        <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-700/60">
          <i className="fa-solid fa-user text-[11px] text-indigo-400"></i>
          <span className="font-medium max-w-[100px] truncate text-slate-200">
            {user.username ? `@${user.username}` : user.first_name || 'Пользователь'}
          </span>
        </div>
      </div>
    </header>
  );
};
