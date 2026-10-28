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

export const api = {
  async getStatus(): Promise<{ status: string; templatesCount: number; memesCount: number; pendingCount: number } | null> {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getTemplates(): Promise<MemeTemplate[] | null> {
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async addTemplate(title: string, url: string): Promise<MemeTemplate | null> {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, isCustom: true }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async renameTemplate(id: string, title: string): Promise<MemeTemplate | null> {
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async resetTemplates(): Promise<MemeTemplate[] | null> {
    try {
      const res = await fetch('/api/templates/reset', {
        method: 'POST',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.templates;
    } catch {
      return null;
    }
  },

  async getMemes(): Promise<{ pending: MemeItem[]; approved: MemeItem[] } | null> {
    try {
      const res = await fetch('/api/memes');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async submitMeme(dataUrl: string, author: string): Promise<MemeItem | null> {
    try {
      const res = await fetch('/api/memes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, author }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateMemeStatus(id: string, status: 'approved' | 'rejected', isAnonymous?: boolean): Promise<boolean> {
    try {
      const res = await fetch(`/api/memes/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, isAnonymous }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async toggleMemeAnonymity(id: string, isAnonymous?: boolean): Promise<MemeItem | null> {
    try {
      const res = await fetch(`/api/memes/${encodeURIComponent(id)}/anonymity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnonymous }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getAdminIds(): Promise<number[] | null> {
    try {
      const res = await fetch('/api/admin-ids');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async addAdminId(id: number): Promise<number[] | null> {
    try {
      const res = await fetch('/api/admin-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async removeAdminId(id: number): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin-ids/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getSyncPayload(): Promise<SyncPayload | null> {
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async applySyncPayload(payload: SyncPayload): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
