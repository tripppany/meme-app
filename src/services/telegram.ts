import { TelegramUser } from '../types/meme';

export interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  showAlert?: (message: string, callback?: () => void) => void;
  showConfirm?: (message: string, callback?: (confirmed: boolean) => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  BackButton?: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  initDataUnsafe?: {
    user?: TelegramUser & {
      language_code?: string;
      is_premium?: boolean;
    };
    start_param?: string;
  };
  colorScheme?: 'light' | 'dark';
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function isTelegramEnv(): boolean {
  const tg = getTelegramWebApp();
  return Boolean(tg && tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0);
}

export function initTelegram(): TelegramUser | null {
  const tg = getTelegramWebApp();
  if (!tg) return null;

  try {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation?.();
    tg.setHeaderColor?.('#1e293b');
    tg.setBackgroundColor?.('#0f172a');
    return tg.initDataUnsafe?.user || null;
  } catch (err) {
    console.warn('Telegram init error:', err);
    return null;
  }
}

export function telegramHaptic(type: 'light' | 'medium' | 'success' | 'error' = 'light') {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;
  try {
    if (type === 'success' || type === 'error') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch {
    // Ignore if not supported
  }
}

export function telegramAlert(message: string, callback?: () => void) {
  const tg = getTelegramWebApp();
  if (tg?.showAlert) {
    try {
      tg.showAlert(message, callback);
      return;
    } catch {
      // Fallback
    }
  }
  if (callback) callback();
}

export function telegramConfirm(message: string, onConfirm: () => void) {
  const tg = getTelegramWebApp();
  if (tg?.showConfirm) {
    try {
      tg.showConfirm(message, (confirmed) => {
        if (confirmed) onConfirm();
      });
      return;
    } catch {
      // Fallback
    }
  }
  // Safe fallback without blocking window.confirm in iframe
  onConfirm();
}
