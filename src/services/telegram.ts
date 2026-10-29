import { TelegramUser } from '../types/meme';

export interface TelegramWebApp {
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  enableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  showAlert?: (message: string, callback?: () => void) => void;
  showConfirm?: (message: string, callback?: (confirmed: boolean) => void) => void;
  HapticFeedback?: {
    impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged?: () => void;
  };
  BackButton?: {
    isVisible?: boolean;
    show?: () => void;
    hide?: () => void;
    onClick?: (cb: () => void) => void;
    offClick?: (cb: () => void) => void;
  };
  initDataUnsafe?: {
    user?: TelegramUser & {
      language_code?: string;
      is_premium?: boolean;
    };
    start_param?: string;
    auth_date?: string;
    hash?: string;
    query_id?: string;
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
      WebApp?: TelegramWebApp;
    };
    TelegramWebviewProxy?: {
      postEvent: (eventType: string, eventData: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        webApp?: {
          postMessage: (data: string | object) => void;
        };
      };
    };
  }
}

/**
 * Dispatch an event to Telegram's native WebView bridge (Android, iOS, or Web iframe).
 * This works natively even if the external telegram-web-app.js script fails to load over VPN.
 */
function postEventToTelegram(eventType: string, eventData: any = ''): void {
  try {
    const dataStr = typeof eventData === 'string' ? eventData : JSON.stringify(eventData);
    const win = window as any;

    // Android Telegram WebView
    if (win.TelegramWebviewProxy?.postEvent) {
      win.TelegramWebviewProxy.postEvent(eventType, dataStr);
      return;
    }

    // iOS Telegram WKWebView
    if (win.webkit?.messageHandlers?.webApp?.postMessage) {
      win.webkit.messageHandlers.webApp.postMessage(JSON.stringify({ eventType, eventData: dataStr }));
      return;
    }

    // Web / Desktop iframe
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage(JSON.stringify({ eventType, eventData: dataStr }), 'https://web.telegram.org');
    }
  } catch {
    // Ignore WebView bridge errors
  }
}

/**
 * Parse Telegram parameters from URL hash or query string.
 * Telegram passes #tgWebAppData=... or ?tgWebAppData=...
 */
function parseUrlTelegramData(): { user?: TelegramUser; start_param?: string } {
  try {
    if (typeof window === 'undefined') return {};
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const search = window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search;
    const query = hash || search;
    if (!query) return {};

    const urlParams = new URLSearchParams(query);
    const rawData = urlParams.get('tgWebAppData') || urlParams.get('initData');

    if (rawData) {
      const dataParams = new URLSearchParams(rawData);
      const userStr = dataParams.get('user');
      let user: TelegramUser | undefined;
      if (userStr) {
        try {
          user = JSON.parse(decodeURIComponent(userStr));
        } catch {
          try {
            user = JSON.parse(userStr);
          } catch {
            // failed to parse
          }
        }
      }
      return {
        user,
        start_param: dataParams.get('start_param') || urlParams.get('tgWebAppStartParam') || undefined,
      };
    }
  } catch (e) {
    console.warn('Error parsing Telegram URL params:', e);
  }
  return {};
}

// Back button click handlers registry for polyfill
const backButtonListeners = new Set<() => void>();

/**
 * Create a standalone, 100% resilient Telegram WebApp bridge
 * that never hangs or fails even without external script connectivity.
 */
function getOrCreateTelegramBridge(): TelegramWebApp {
  if (typeof window === 'undefined') {
    return {};
  }

  if (!window.Telegram) {
    window.Telegram = {};
  }

  if (window.Telegram.WebApp) {
    return window.Telegram.WebApp;
  }

  const { user, start_param } = parseUrlTelegramData();

  const syntheticWebApp: TelegramWebApp = {
    ready: () => {
      postEventToTelegram('web_app_ready');
    },
    expand: () => {
      postEventToTelegram('web_app_expand');
    },
    close: () => {
      postEventToTelegram('web_app_close');
    },
    enableClosingConfirmation: () => {
      postEventToTelegram('web_app_setup_closing_behavior', { need_confirmation: true });
    },
    setHeaderColor: (color: string) => {
      postEventToTelegram('web_app_set_header_color', { color_key: 'bg_color', color });
    },
    setBackgroundColor: (color: string) => {
      postEventToTelegram('web_app_set_background_color', { color });
    },
    showAlert: (message: string, callback?: () => void) => {
      postEventToTelegram('web_app_open_popup', {
        title: 'Уведомление',
        message,
        buttons: [{ id: 'ok', type: 'ok' }],
      });
      if (callback) setTimeout(callback, 200);
    },
    showConfirm: (message: string, callback?: (confirmed: boolean) => void) => {
      postEventToTelegram('web_app_open_popup', {
        title: 'Подтверждение',
        message,
        buttons: [
          { id: 'ok', type: 'ok', text: 'Да' },
          { id: 'cancel', type: 'cancel', text: 'Отмена' },
        ],
      });
      if (callback) setTimeout(() => callback(true), 200);
    },
    HapticFeedback: {
      impactOccurred: (style) => {
        postEventToTelegram('web_app_trigger_haptic_feedback', { type: 'impact', impact_style: style });
      },
      notificationOccurred: (type) => {
        postEventToTelegram('web_app_trigger_haptic_feedback', { type: 'notification', notification_type: type });
      },
      selectionChanged: () => {
        postEventToTelegram('web_app_trigger_haptic_feedback', { type: 'selection_change' });
      },
    },
    BackButton: {
      isVisible: false,
      show: () => {
        if (syntheticWebApp.BackButton) syntheticWebApp.BackButton.isVisible = true;
        postEventToTelegram('web_app_setup_back_button', { is_visible: true });
      },
      hide: () => {
        if (syntheticWebApp.BackButton) syntheticWebApp.BackButton.isVisible = false;
        postEventToTelegram('web_app_setup_back_button', { is_visible: false });
      },
      onClick: (cb) => {
        backButtonListeners.add(cb);
      },
      offClick: (cb) => {
        backButtonListeners.delete(cb);
      },
    },
    initDataUnsafe: {
      user,
      start_param,
    },
    colorScheme: 'dark',
    themeParams: {
      bg_color: '#0f172a',
      text_color: '#ffffff',
      hint_color: '#94a3b8',
      link_color: '#6366f1',
      button_color: '#6366f1',
      button_text_color: '#ffffff',
      secondary_bg_color: '#1e293b',
    },
  };

  window.Telegram.WebApp = syntheticWebApp;
  return syntheticWebApp;
}

export function getTelegramWebApp(): TelegramWebApp | null {
  try {
    return getOrCreateTelegramBridge();
  } catch {
    return null;
  }
}

export function isTelegramEnv(): boolean {
  try {
    const tg = getTelegramWebApp();
    if (tg?.initDataUnsafe?.user) return true;
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.TelegramWebviewProxy || win.webkit?.messageHandlers?.webApp) return true;
      if (window.location.hash.includes('tgWebAppData') || window.location.search.includes('tgWebAppData')) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function initTelegram(onUserDetected?: (user: TelegramUser) => void): TelegramUser | null {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready?.();
      tg.expand?.();
      tg.enableClosingConfirmation?.();
      tg.setHeaderColor?.('#1e293b');
      tg.setBackgroundColor?.('#0f172a');
    } catch (e) {
      console.warn('Telegram init ready warning:', e);
    }

    if (tg.initDataUnsafe?.user) {
      if (onUserDetected) onUserDetected(tg.initDataUnsafe.user);
      return tg.initDataUnsafe.user;
    }
  }

  // Check URL params if user was not in initDataUnsafe yet
  const { user } = parseUrlTelegramData();
  if (user) {
    if (tg && tg.initDataUnsafe) {
      tg.initDataUnsafe.user = user;
    }
    if (onUserDetected) onUserDetected(user);
    return user;
  }

  return null;
}

export function telegramHaptic(type: 'light' | 'medium' | 'success' | 'error' = 'light') {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;
  try {
    if (type === 'success' || type === 'error') {
      tg.HapticFeedback.notificationOccurred?.(type);
    } else {
      tg.HapticFeedback.impactOccurred?.(type);
    }
  } catch {
    // Ignore if not supported
  }
}

export function setTelegramBackButton(visible: boolean, onClick?: () => void): () => void {
  const tg = getTelegramWebApp();
  if (!tg?.BackButton) return () => {};

  try {
    if (visible) {
      tg.BackButton.show?.();
      if (onClick && tg.BackButton.onClick) {
        tg.BackButton.onClick(onClick);
        return () => {
          try {
            tg.BackButton?.offClick?.(onClick);
          } catch {
            // ignore
          }
        };
      }
    } else {
      tg.BackButton.hide?.();
    }
  } catch (e) {
    console.warn('Telegram BackButton handling error:', e);
  }

  return () => {};
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
  onConfirm();
}
