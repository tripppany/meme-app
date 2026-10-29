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
 * Resilient fetch with a strict timeout to prevent indefinite hangs over slow/flaky VPNs or proxies.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
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
    throw err;
  }
}

export const api = {
  async getStatus(): Promise<{ status: string; templatesCount: number; memesCount: number; pendingCount: number } | null> {
    try {
      const res = await fetchWithTimeout('/api/status', {}, 3000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getTemplates(): Promise<MemeTemplate[] | null> {
    try {
      const res = await fetchWithTimeout('/api/templates', {}, 3500);
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
      }, 5000);
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
      }, 4000);
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
      }, 4000);
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
      }, 4000);
      return res.ok;
    } catch {
      return false;
    }
  },

  async resetTemplates(): Promise<MemeTemplate[] | null> {
    try {
      const res = await fetchWithTimeout('/api/templates/reset', {
        method: 'POST',
      }, 4000);
      if (!res.ok) return null;
      const data = await res.json();
      return data.templates;
    } catch {
      return null;
    }
  },

  async getMemes(): Promise<{ pending: MemeItem[]; approved: MemeItem[] } | null> {
    try {
      const res = await fetchWithTimeout('/api/memes', {}, 3500);
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
      }, 8000); // Allow slightly longer for large base64 image
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
      }, 4000);
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
      }, 4000);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getAdminIds(): Promise<number[] | null> {
    try {
      const res = await fetchWithTimeout('/api/admin-ids', {}, 3500);
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
      }, 4000);
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
      }, 4000);
      return res.ok;
    } catch {
      return false;
    }
  },

  async getSyncPayload(): Promise<SyncPayload | null> {
    try {
      const res = await fetchWithTimeout('/api/sync', {}, 4000);
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
      }, 6000);
      return res.ok;
    } catch {
      return false;
    }
  },
};
