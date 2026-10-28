import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'server_data.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initial default templates
const INITIAL_TEMPLATES = [
  { 
    id: 't1', 
    title: 'Кот в беседе', 
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%232a2d34'/><circle cx='250' cy='230' r='140' fill='%23e5e7eb'/><polygon points='130,150 170,70 210,130' fill='%23e5e7eb'/><polygon points='290,130 330,70 370,150' fill='%23e5e7eb'/><polygon points='145,140 170,85 195,125' fill='%23f472b6'/><polygon points='305,125 330,85 355,140' fill='%23f472b6'/><ellipse cx='200' cy='210' rx='18' ry='24' fill='%2310b981'/><ellipse cx='300' cy='210' rx='18' ry='24' fill='%2310b981'/><circle cx='200' cy='210' r='8' fill='%23000'/><circle cx='300' cy='210' r='8' fill='%23000'/><polygon points='240,240 260,240 250,255' fill='%23f472b6'/><path d='M220 265 Q235 280 250 265 Q265 280 280 265' stroke='%23000' stroke-width='4' fill='none'/></svg>",
    isDefault: true
  },
  { 
    id: 't2', 
    title: 'Удивленный пёс', 
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%23374151'/><circle cx='250' cy='250' r='150' fill='%23d97706'/><circle cx='190' cy='210' r='30' fill='%23fff'/><circle cx='310' cy='210' r='30' fill='%23fff'/><circle cx='190' cy='210' r='12' fill='%23000'/><circle cx='310' cy='210' r='12' fill='%23000'/><ellipse cx='250' cy='280' rx='40' ry='30' fill='%2378350f'/></svg>",
    isDefault: true
  },
  {
    id: 't3',
    title: 'Две кнопки выбора',
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%231e293b'/><circle cx='250' cy='180' r='110' fill='%23fcd34d'/><ellipse cx='215' cy='160' rx='14' ry='18' fill='%23000'/><ellipse cx='285' cy='160' rx='14' ry='18' fill='%23000'/><ellipse cx='250' cy='210' rx='35' ry='20' fill='%23ef4444'/><circle cx='290' cy='130' r='12' fill='%2338bdf8'/><path d='M290 118 Q305 130 290 142' stroke='%2338bdf8' stroke-width='3' fill='none'/><rect x='60' y='320' width='160' height='100' rx='16' fill='%23ef4444'/><rect x='280' y='320' width='160' height='100' rx='16' fill='%233b82f6'/><text x='140' y='380' font-family='Arial' font-weight='bold' font-size='22' fill='white' text-anchor='middle'>ВАРИАНТ А</text><text x='360' y='380' font-family='Arial' font-weight='bold' font-size='22' fill='white' text-anchor='middle'>ВАРИАНТ Б</text></svg>",
    isDefault: true
  },
  {
    id: 't4',
    title: 'Мегамозг',
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%230f172a'/><circle cx='250' cy='220' r='140' fill='%2338bdf8'/><ellipse cx='200' cy='210' rx='20' ry='26' fill='%23ffffff'/><ellipse cx='300' cy='210' rx='20' ry='26' fill='%23ffffff'/><circle cx='205' cy='210' r='10' fill='%230284c7'/><circle cx='305' cy='210' r='10' fill='%230284c7'/><path d='M170 170 Q200 150 230 170' stroke='%230369a1' stroke-width='6' fill='none'/><path d='M270 170 Q300 150 330 170' stroke='%230369a1' stroke-width='6' fill='none'/><path d='M200 270 Q250 320 300 270' stroke='%230369a1' stroke-width='8' fill='none'/></svg>",
    isDefault: true
  }
];

const INITIAL_APPROVED = [
  {
    id: 'seed-1',
    dataUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%232a2d34'/><circle cx='250' cy='230' r='140' fill='%23e5e7eb'/><polygon points='130,150 170,70 210,130' fill='%23e5e7eb'/><polygon points='290,130 330,70 370,150' fill='%23e5e7eb'/><ellipse cx='200' cy='210' rx='18' ry='24' fill='%2310b981'/><ellipse cx='300' cy='210' rx='18' ry='24' fill='%2310b981'/><circle cx='200' cy='210' r='8' fill='%23000'/><circle cx='300' cy='210' r='8' fill='%23000'/><path d='M220 265 Q235 280 250 265 Q265 280 280 265' stroke='%23000' stroke-width='4' fill='none'/><text x='250' y='60' font-family='Impact' font-size='38' font-weight='900' fill='white' stroke='black' stroke-width='3' text-anchor='middle'>КОГДА СДАЛ ПРОЕКТ</text><text x='250' y='460' font-family='Impact' font-size='38' font-weight='900' fill='white' stroke='black' stroke-width='3' text-anchor='middle'>ЗА 5 МИНУТ ДО ДЕДЛАЙНА</text></svg>",
    author: '@chat_legend',
    timestamp: Date.now() - 3600000 * 2,
    status: 'approved'
  }
];

interface ServerState {
  templates: Array<{ id: string; title: string; url: string; isCustom?: boolean; isDefault?: boolean; createdAt?: number }>;
  memes: {
    pending: any[];
    approved: any[];
  };
  adminIds: number[];
  lastModified: number;
}

let serverState: ServerState = {
  templates: INITIAL_TEMPLATES,
  memes: {
    pending: [],
    approved: INITIAL_APPROVED,
  },
  adminIds: [502413224],
  lastModified: Date.now(),
};

// Load saved data if exists
function loadPersistedData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.templates)) {
        serverState = parsed;
        if (serverState.memes && Array.isArray(serverState.memes.approved)) {
          serverState.memes.approved.forEach((m: any) => {
            if (!m.realAuthor) {
              m.realAuthor = (m.author && m.author !== 'Аноним') ? m.author : 'Пользователь';
            }
            if (m.isAnonymous === undefined) {
              m.isAnonymous = m.author === 'Аноним';
            }
          });
        }
        console.log('[Server] Loaded persisted state with', serverState.templates.length, 'templates.');
      }
    }
  } catch (err) {
    console.error('[Server] Failed to load data file, using initial state:', err);
  }
}

function persistData() {
  try {
    serverState.lastModified = Date.now();
    fs.writeFileSync(DATA_FILE, JSON.stringify(serverState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server] Failed to persist data:', err);
  }
}

loadPersistedData();

// ================= API ROUTES =================

// Health and Sync Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    deviceCountActive: true,
    lastModified: serverState.lastModified,
    templatesCount: serverState.templates.length,
    memesCount: serverState.memes.approved.length,
    pendingCount: serverState.memes.pending.length,
  });
});

// Full state sync
app.get('/api/sync', (req, res) => {
  res.json(serverState);
});

app.post('/api/sync', (req, res) => {
  const incoming = req.body;
  if (incoming && Array.isArray(incoming.templates)) {
    serverState = {
      templates: incoming.templates,
      memes: incoming.memes || serverState.memes,
      adminIds: incoming.adminIds || serverState.adminIds,
      lastModified: Date.now(),
    };
    persistData();
    res.json({ success: true, message: 'Синхронизация успешно выполнена' });
  } else {
    res.status(400).json({ error: 'Неверный формат данных синхронизации' });
  }
});

// Templates CRUD
app.get('/api/templates', (req, res) => {
  res.json(serverState.templates);
});

app.post('/api/templates', (req, res) => {
  const { title, url, isCustom } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: 'title and url are required' });
  }
  const newTemplate = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: String(title).trim(),
    url: String(url),
    isCustom: isCustom !== false,
    createdAt: Date.now(),
  };
  serverState.templates.push(newTemplate);
  persistData();
  res.status(201).json(newTemplate);
});

app.patch('/api/templates/:id', (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Valid title is required' });
  }

  const template = serverState.templates.find((t) => t.id === id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  template.title = String(title).trim();
  persistData();
  res.json(template);
});

app.delete('/api/templates/:id', (req, res) => {
  const { id } = req.params;
  const initialCount = serverState.templates.length;
  serverState.templates = serverState.templates.filter((t) => t.id !== id);
  if (serverState.templates.length === initialCount) {
    return res.status(404).json({ error: 'Template not found' });
  }
  persistData();
  res.json({ success: true, deletedId: id, remaining: serverState.templates.length });
});

app.post('/api/templates/reset', (req, res) => {
  serverState.templates = [...INITIAL_TEMPLATES];
  persistData();
  res.json({ success: true, templates: serverState.templates });
});

// Memes Endpoints
app.get('/api/memes', (req, res) => {
  res.json(serverState.memes);
});

app.post('/api/memes', (req, res) => {
  const { dataUrl, author } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ error: 'dataUrl is required' });
  }
  const authorName = author || 'Пользователь';
  const newMeme = {
    id: 'meme-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    dataUrl,
    author: authorName,
    realAuthor: authorName,
    isAnonymous: false,
    timestamp: Date.now(),
    status: 'pending',
  };
  serverState.memes.pending.unshift(newMeme);
  persistData();
  res.status(201).json(newMeme);
});

app.put('/api/memes/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, isAnonymous } = req.body; // 'approved' or 'rejected'

  const pendingIndex = serverState.memes.pending.findIndex((m) => m.id === id);
  if (pendingIndex === -1) {
    return res.status(404).json({ error: 'Meme not found in pending list' });
  }

  const [item] = serverState.memes.pending.splice(pendingIndex, 1);
  if (status === 'approved') {
    item.status = 'approved';
    if (!item.realAuthor) item.realAuthor = item.author;
    if (isAnonymous !== undefined) {
      item.isAnonymous = Boolean(isAnonymous);
      item.author = item.isAnonymous ? 'Аноним' : item.realAuthor;
    }
    serverState.memes.approved.unshift(item);
  }
  persistData();
  res.json({ success: true, meme: item });
});

app.patch('/api/memes/:id/anonymity', (req, res) => {
  const { id } = req.params;
  const { isAnonymous } = req.body;
  const meme = serverState.memes.approved.find((m) => m.id === id);
  if (!meme) {
    return res.status(404).json({ error: 'Approved meme not found' });
  }
  if (!meme.realAuthor) meme.realAuthor = meme.author;
  meme.isAnonymous = isAnonymous !== undefined ? Boolean(isAnonymous) : !meme.isAnonymous;
  meme.author = meme.isAnonymous ? 'Аноним' : meme.realAuthor;
  persistData();
  res.json(meme);
});

// Admin IDs
app.get('/api/admin-ids', (req, res) => {
  res.json(serverState.adminIds);
});

app.post('/api/admin-ids', (req, res) => {
  const { id } = req.body;
  const numId = Number(id);
  if (!numId || isNaN(numId)) {
    return res.status(400).json({ error: 'Valid Telegram ID is required' });
  }
  if (!serverState.adminIds.includes(numId)) {
    serverState.adminIds.push(numId);
    persistData();
  }
  res.status(201).json(serverState.adminIds);
});

app.delete('/api/admin-ids/:id', (req, res) => {
  const idToRemove = Number(req.params.id);
  if (idToRemove === 502413224) {
    return res.status(400).json({ error: 'Cannot remove primary admin' });
  }
  serverState.adminIds = serverState.adminIds.filter((id) => id !== idToRemove);
  persistData();
  res.json(serverState.adminIds);
});

// Mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Cross-device synced server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
