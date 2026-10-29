import { MemeItem, MemeTemplate } from '../types/meme';

export interface SyncPayload {
  templates: MemeTemplate[];
  memes: {
    pending: MemeItem[];
    approved: MemeItem[];
  };
  adminIds: number[];
  lastModified?: number;
}

/**
 * Resilient fetch with a 10s default timeout and automatic single retry for transient VPN dropouts.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000, retries = 1): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) {
        throw err;
      }
      // Brief backoff before retry
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error('Network request failed');
}

export const api = {
  async getStatus(): Promise<{ status: string; templatesCount: number; memesCount: number; pendingCount: number } | null> {
    try {
      const res = await fetchWithTimeout('/api/status', {}, 8000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getTemplates(): Promise<MemeTemplate[] | null> {
    try {
      const res = await fetchWithTimeout('/api/templates', {}, 10000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async addTemplate(title: string, url: string, isHidden = false): Promise<MemeTemplate | null> {
    try {
      const res = await fetchWithTimeout('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, isCustom: true, isHidden }),
      }, 15000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async renameTemplate(id: string, title: string): Promise<MemeTemplate | null> {
    try {
      const res = await fetchWithTimeout(`/api/templates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }, 10000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async toggleTemplateVisibility(id: string, isHidden?: boolean): Promise<MemeTemplate | null> {
    try {
      const res = await fetchWithTimeout(`/api/templates/${encodeURIComponent(id)}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden }),
      }, 10000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`/api/templates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }, 10000);
      return res.ok;
    } catch {
      return false;
    }
  },

  async resetTemplates(): Promise<MemeTemplate[] | null> {
    try {
      const res = await fetchWithTimeout('/api/templates/reset', {
        method: 'POST',
      }, 10000);
      if (!res.ok) return null;
      const data = await res.json();
      return data.templates;
    } catch {
      return null;
    }
  },

  async getMemes(): Promise<{ pending: MemeItem[]; approved: MemeItem[] } | null> {
    try {
      const res = await fetchWithTimeout('/api/memes', {}, 10000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async submitMeme(dataUrl: string, author: string): Promise<MemeItem | null> {
    try {
      const res = await fetchWithTimeout('/api/memes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, author }),
      }, 20000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateMemeStatus(id: string, status: 'approved' | 'rejected', isAnonymous?: boolean): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`/api/memes/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, isAnonymous }),
      }, 10000);
      return res.ok;
    } catch {
      return false;
    }
  },

  async toggleMemeAnonymity(id: string, isAnonymous?: boolean): Promise<MemeItem | null> {
    try {
      const res = await fetchWithTimeout(`/api/memes/${encodeURIComponent(id)}/anonymity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnonymous }),
      }, 10000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getAdminIds(): Promise<number[] | null> {
    try {
      const res = await fetchWithTimeout('/api/admin-ids', {}, 10000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async addAdminId(id: number): Promise<number[] | null> {
    try {
      const res = await fetchWithTimeout('/api/admin-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }, 10000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async removeAdminId(id: number): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`/api/admin-ids/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }, 10000);
      return res.ok;
    } catch {
      return false;
    }
  },

  async getSyncPayload(): Promise<SyncPayload | null> {
    try {
      const res = await fetchWithTimeout('/api/sync', {}, 10000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async applySyncPayload(payload: SyncPayload): Promise<boolean> {
    try {
      const res = await fetchWithTimeout('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 15000);
      return res.ok;
    } catch {
      return false;
    }
  },
};
