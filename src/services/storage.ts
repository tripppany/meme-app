import { MemeItem, MemeTemplate } from '../types/meme';
import { DEFAULT_TEMPLATES, INITIAL_APPROVED_MEMES, PRIMARY_ADMIN_IDS } from '../constants/templates';

const STORAGE_KEYS = {
  MEMES: 'meme_app_memes_v3',
  ALL_TEMPLATES: 'meme_app_all_templates_v3',
  ADMIN_IDS: 'meme_app_admin_ids_v3',
  IS_ADMIN: 'meme_app_is_admin',
};

export interface MemesState {
  pending: MemeItem[];
  approved: MemeItem[];
}

export interface AppSyncData {
  templates: MemeTemplate[];
  memes: MemesState;
  adminIds: number[];
  exportedAt: number;
}

// In-memory fallback if localStorage is disabled or throws SecurityError
const inMemoryStore = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // Storage access restricted/blocked
  }
  return inMemoryStore.get(key) ?? null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Storage access restricted/blocked
  }
  inMemoryStore.set(key, value);
}

// BroadcastChannel for instant same-browser cross-tab sync
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('meme_app_sync_channel');
  }
} catch {
  syncChannel = null;
}

export function broadcastLocalChange(type: 'templates' | 'memes' | 'adminIds' | 'full'): void {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type, timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
}

export function subscribeToSyncChannel(callback: (type: string) => void): () => void {
  if (!syncChannel) return () => {};
  const handler = (event: MessageEvent) => {
    try {
      if (event.data?.type) {
        callback(event.data.type);
      }
    } catch {
      // ignore
    }
  };
  try {
    syncChannel.addEventListener('message', handler);
  } catch {
    // ignore
  }
  return () => {
    try {
      syncChannel?.removeEventListener('message', handler);
    } catch {
      // ignore
    }
  };
}

export function loadMemesState(): MemesState {
  try {
    const raw = safeGetItem(STORAGE_KEYS.MEMES);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        pending: Array.isArray(parsed.pending) ? parsed.pending : [],
        approved: Array.isArray(parsed.approved) ? parsed.approved : [],
      };
    }
  } catch (e) {
    console.error('Error loading memes from storage:', e);
  }
  return {
    pending: [],
    approved: INITIAL_APPROVED_MEMES,
  };
}

export function saveMemesState(state: MemesState): void {
  try {
    safeSetItem(STORAGE_KEYS.MEMES, JSON.stringify(state));
    broadcastLocalChange('memes');
  } catch (e) {
    console.error('Error saving memes to storage:', e);
  }
}

export function loadAllTemplates(): MemeTemplate[] {
  try {
    const raw = safeGetItem(STORAGE_KEYS.ALL_TEMPLATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading templates from storage:', e);
  }
  return DEFAULT_TEMPLATES;
}

export function saveAllTemplates(templates: MemeTemplate[]): void {
  try {
    safeSetItem(STORAGE_KEYS.ALL_TEMPLATES, JSON.stringify(templates));
    broadcastLocalChange('templates');
  } catch (e) {
    console.error('Error saving templates to storage:', e);
  }
}

export function loadAdminIds(): number[] {
  try {
    const raw = safeGetItem(STORAGE_KEYS.ADMIN_IDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => !isNaN(n));
    }
  } catch (e) {
    console.error('Error loading admin IDs:', e);
  }
  return PRIMARY_ADMIN_IDS;
}

export function saveAdminIds(ids: number[]): void {
  try {
    safeSetItem(STORAGE_KEYS.ADMIN_IDS, JSON.stringify(ids));
    broadcastLocalChange('adminIds');
  } catch (e) {
    console.error('Error saving admin IDs:', e);
  }
}

export function getStoredAdminFlag(): boolean {
  try {
    return safeGetItem(STORAGE_KEYS.IS_ADMIN) === 'true';
  } catch {
    return false;
  }
}

export function setStoredAdminFlag(flag: boolean): void {
  try {
    safeSetItem(STORAGE_KEYS.IS_ADMIN, flag ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function exportSyncCode(templates: MemeTemplate[], memes: MemesState, adminIds: number[]): string {
  const payload: AppSyncData = {
    templates,
    memes,
    adminIds,
    exportedAt: Date.now(),
  };
  return JSON.stringify(payload);
}

export function parseSyncCode(code: string): AppSyncData | null {
  try {
    const parsed = JSON.parse(code.trim());
    if (parsed && Array.isArray(parsed.templates)) {
      return {
        templates: parsed.templates,
        memes: {
          pending: Array.isArray(parsed.memes?.pending) ? parsed.memes.pending : [],
          approved: Array.isArray(parsed.memes?.approved) ? parsed.memes.approved : [],
        },
        adminIds: Array.isArray(parsed.adminIds) ? parsed.adminIds : PRIMARY_ADMIN_IDS,
        exportedAt: parsed.exportedAt || Date.now(),
      };
    }
  } catch {
    return null;
  }
  return null;
}
