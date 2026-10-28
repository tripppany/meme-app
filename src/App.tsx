import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MemeItem, MemeTemplate, TelegramUser } from './types/meme';
import { DEFAULT_TEMPLATES, PRIMARY_ADMIN_IDS } from './constants/templates';
import {
  loadMemesState,
  saveMemesState,
  loadAllTemplates,
  saveAllTemplates,
  loadAdminIds,
  saveAdminIds,
  getStoredAdminFlag,
  setStoredAdminFlag,
  exportSyncCode,
  parseSyncCode,
  subscribeToSyncChannel,
  MemesState,
} from './services/storage';
import { api } from './services/api';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { EditorView } from './components/EditorView';
import { GalleryView } from './components/GalleryView';
import { AdminView } from './components/AdminView';
import { TemplateModal } from './components/TemplateModal';
import { Toast, ToastMessage } from './components/Toast';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
      };
    };
  }
}

export const App: React.FC = () => {
  // Navigation tab
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Telegram User detection
  const [user, setUser] = useState<TelegramUser>({
    first_name: 'Пользователь',
    username: 'user',
  });

  // Admin access state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // App data state (with fallback to storage)
  const [memesState, setMemesState] = useState<MemesState>(() => loadMemesState());
  const [templates, setTemplates] = useState<MemeTemplate[]>(() => loadAllTemplates());
  const [adminIds, setAdminIds] = useState<number[]>(() => loadAdminIds());
  const [serverConnected, setServerConnected] = useState<boolean>(true);

  // Editor template selection
  const [currentTemplateUrl, setCurrentTemplateUrl] = useState<string>(() => {
    const loaded = loadAllTemplates();
    return loaded.length > 0 ? loaded[0].url : DEFAULT_TEMPLATES[0].url;
  });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'info' | 'error', text: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, text }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync state from server helper
  const syncFromServer = useCallback(async (notify = false) => {
    try {
      const [remoteTemplates, remoteMemes, remoteAdmins] = await Promise.all([
        api.getTemplates(),
        api.getMemes(),
        api.getAdminIds(),
      ]);

      let changed = false;
      if (remoteTemplates && Array.isArray(remoteTemplates)) {
        setTemplates(remoteTemplates);
        saveAllTemplates(remoteTemplates);
        changed = true;
      }
      if (remoteMemes && Array.isArray(remoteMemes.approved)) {
        setMemesState(remoteMemes);
        saveMemesState(remoteMemes);
        changed = true;
      }
      if (remoteAdmins && Array.isArray(remoteAdmins)) {
        setAdminIds(remoteAdmins);
        saveAdminIds(remoteAdmins);
        changed = true;
      }

      setServerConnected(true);
      if (notify && changed) {
        addToast('success', 'Данные успешно синхронизированы со всеми устройствами');
      }
    } catch {
      setServerConnected(false);
    }
  }, [addToast]);

  // Initial load & Polling for real-time cross-device synchronization
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      syncFromServer();
    }

    // Poll every 5 seconds for cross-device updates
    const pollInterval = setInterval(() => {
      syncFromServer();
    }, 5000);

    // Refresh when user focuses the tab/window
    const handleFocus = () => {
      syncFromServer();
    };
    window.addEventListener('focus', handleFocus);

    // BroadcastChannel for instant cross-tab sync
    const unsubscribeChannel = subscribeToSyncChannel(() => {
      setTemplates(loadAllTemplates());
      setMemesState(loadMemesState());
      setAdminIds(loadAdminIds());
    });

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      unsubscribeChannel();
    };
  }, [syncFromServer]);

  // Initialize Telegram WebApp & user access
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.initDataUnsafe?.user) {
          setUser(tg.initDataUnsafe.user);
        }
      } catch (e) {
        console.warn('Telegram WebApp initialization error:', e);
      }
    }
  }, []);

  // Check admin rights
  useEffect(() => {
    const allAdmins = Array.from(new Set([...PRIMARY_ADMIN_IDS, ...adminIds]));
    const savedFlag = getStoredAdminFlag();
    const isIdAdmin = user.id ? allAdmins.includes(Number(user.id)) : false;

    if (savedFlag || isIdAdmin) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user.id, adminIds]);

  // Secret admin toggle
  const handleToggleAdmin = () => {
    const nextState = !isAdmin;
    setIsAdmin(nextState);
    setStoredAdminFlag(nextState);
    if (nextState) {
      addToast('success', 'Режим администратора активирован!');
    } else {
      addToast('info', 'Режим администратора отключен');
      if (currentTab === 'admin') {
        setCurrentTab('home');
      }
    }
  };

  // Template selection
  const handleSelectTemplate = (template: MemeTemplate) => {
    setCurrentTemplateUrl(template.url);
    setIsTemplateModalOpen(false);
    setCurrentTab('editor');
    addToast('info', `Выбран шаблон "${template.title}"`);
  };

  // Custom upload
  const handleUploadCustomMeme = (dataUrl: string) => {
    setCurrentTemplateUrl(dataUrl);
    setCurrentTab('editor');
    addToast('info', 'Загружено изображение');
  };

  // Submit meme for review
  const handleSubmitForReview = async (dataUrl: string) => {
    const authorTag = user.username ? `@${user.username}` : user.first_name || 'Пользователь';

    // Local optimistic update
    const newMeme: MemeItem = {
      id: 'meme-' + Date.now(),
      dataUrl,
      author: authorTag,
      realAuthor: authorTag,
      isAnonymous: false,
      timestamp: Date.now(),
      status: 'pending',
    };

    setMemesState((prev) => {
      const next = { ...prev, pending: [newMeme, ...prev.pending] };
      saveMemesState(next);
      return next;
    });

    // Send to server
    try {
      await api.submitMeme(dataUrl, authorTag);
    } catch (e) {
      console.warn('Server offline, saved locally:', e);
    }

    addToast('success', 'Мем отправлен на модерацию!');
    setCurrentTab('home');
  };

  // Approve meme (with optional anonymity)
  const handleApproveMeme = async (id: string, isAnonymous = false) => {
    setMemesState((prev) => {
      const target = prev.pending.find((m) => m.id === id);
      if (!target) return prev;
      const realAuthor = target.realAuthor || target.author;
      const approvedMeme: MemeItem = {
        ...target,
        realAuthor,
        isAnonymous,
        author: isAnonymous ? 'Аноним' : realAuthor,
        status: 'approved',
      };
      const next = {
        pending: prev.pending.filter((m) => m.id !== id),
        approved: [approvedMeme, ...prev.approved],
      };
      saveMemesState(next);
      return next;
    });

    try {
      await api.updateMemeStatus(id, 'approved', isAnonymous);
    } catch (e) {
      console.warn('API error:', e);
    }

    addToast(
      'success',
      isAnonymous
        ? 'Мем опубликован анонимно!'
        : 'Мем одобрен и опубликован в галерее!'
    );
  };

  // Toggle anonymity of an already approved meme
  const handleToggleAnonymity = async (id: string, explicitAnonymity?: boolean) => {
    const target = memesState.approved.find((m) => m.id === id);
    if (!target) return;

    const realAuthor = target.realAuthor || (target.author !== 'Аноним' ? target.author : 'Пользователь');
    const newAnonState = explicitAnonymity !== undefined ? explicitAnonymity : !target.isAnonymous;

    const updatedMeme: MemeItem = {
      ...target,
      realAuthor,
      isAnonymous: newAnonState,
      author: newAnonState ? 'Аноним' : realAuthor,
    };

    setMemesState((prev) => {
      const next = {
        ...prev,
        approved: prev.approved.map((m) => (m.id === id ? updatedMeme : m)),
      };
      saveMemesState(next);
      return next;
    });

    try {
      await api.toggleMemeAnonymity(id, newAnonState);
    } catch (e) {
      console.warn('API error:', e);
    }

    addToast(
      'info',
      newAnonState
        ? 'Автор скрыт (мем стал анонимным)'
        : `Автор снова виден: ${realAuthor}`
    );
  };

  // Reject meme
  const handleRejectMeme = async (id: string) => {
    setMemesState((prev) => {
      const next = {
        ...prev,
        pending: prev.pending.filter((m) => m.id !== id),
      };
      saveMemesState(next);
      return next;
    });

    try {
      await api.updateMemeStatus(id, 'rejected');
    } catch (e) {
      console.warn('API error:', e);
    }

    addToast('info', 'Мем отклонен');
  };

  // Add custom template (Admin)
  const handleAddTemplate = async (title: string, dataUrl: string) => {
    const localTemplate: MemeTemplate = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title,
      url: dataUrl,
      isCustom: true,
      createdAt: Date.now(),
    };

    setTemplates((prev) => {
      const next = [localTemplate, ...prev];
      saveAllTemplates(next);
      return next;
    });

    try {
      const remote = await api.addTemplate(title, dataUrl);
      if (remote) {
        setTemplates((prev) => {
          const next = prev.map((t) => (t.id === localTemplate.id ? remote : t));
          saveAllTemplates(next);
          return next;
        });
      }
    } catch (e) {
      console.warn('Server sync error, saved locally:', e);
    }

    addToast('success', `Шаблон "${title}" добавлен и синхронизирован!`);
  };

  // Rename ANY template (Admin)
  const handleRenameTemplate = async (id: string, newTitle: string) => {
    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t));
      saveAllTemplates(next);
      return next;
    });

    try {
      await api.renameTemplate(id, newTitle);
    } catch (e) {
      console.warn('API rename error:', e);
    }

    addToast('success', `Шаблон переименован в "${newTitle}"!`);
  };

  // Delete ANY template (Admin)
  const handleDeleteTemplate = async (id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveAllTemplates(next);
      return next;
    });

    try {
      await api.deleteTemplate(id);
    } catch (e) {
      console.warn('API delete error:', e);
    }

    addToast('info', 'Шаблон удален со всех устройств');
  };

  // Reset templates to standard defaults
  const handleResetTemplates = async () => {
    setTemplates(DEFAULT_TEMPLATES);
    saveAllTemplates(DEFAULT_TEMPLATES);

    try {
      const res = await api.resetTemplates();
      if (res) setTemplates(res);
    } catch (e) {
      console.warn('Reset error:', e);
    }

    addToast('success', 'Базовые шаблоны восстановлены');
  };

  // Add Admin ID
  const handleAddAdminId = async (newId: number) => {
    if (adminIds.includes(newId)) {
      addToast('info', 'Этот Telegram ID уже в списке администраторов');
      return;
    }
    const nextIds = [...adminIds, newId];
    setAdminIds(nextIds);
    saveAdminIds(nextIds);

    try {
      await api.addAdminId(newId);
    } catch (e) {
      console.warn('API admin add error:', e);
    }

    addToast('success', `ID ${newId} добавлен в администраторы`);
  };

  // Remove Admin ID
  const handleRemoveAdminId = async (idToRemove: number) => {
    if (PRIMARY_ADMIN_IDS.includes(idToRemove)) {
      addToast('error', 'Нельзя удалить главного администратора');
      return;
    }
    const nextIds = adminIds.filter((id) => id !== idToRemove);
    setAdminIds(nextIds);
    saveAdminIds(nextIds);

    try {
      await api.removeAdminId(idToRemove);
    } catch (e) {
      console.warn('API admin remove error:', e);
    }

    addToast('info', `ID ${idToRemove} удален из администраторов`);
  };

  // Download meme helper
  const handleDownloadMeme = (meme: MemeItem) => {
    const a = document.createElement('a');
    a.href = meme.dataUrl;
    a.download = `meme_${meme.id}.png`;
    a.click();
    addToast('success', 'Скачивание началось');
  };

  // Export full snapshot code
  const handleExportSyncPayload = (): string => {
    return exportSyncCode(templates, memesState, adminIds);
  };

  // Import full snapshot code
  const handleImportSyncPayload = (jsonString: string): boolean => {
    const parsed = parseSyncCode(jsonString);
    if (!parsed) return false;

    setTemplates(parsed.templates);
    saveAllTemplates(parsed.templates);

    setMemesState(parsed.memes);
    saveMemesState(parsed.memes);

    setAdminIds(parsed.adminIds);
    saveAdminIds(parsed.adminIds);

    // Also push to server
    api.applySyncPayload({
      templates: parsed.templates,
      memes: parsed.memes,
      adminIds: parsed.adminIds,
    }).catch(console.warn);

    addToast('success', 'Конфигурация успешно синхронизирована!');
    return true;
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans pb-20 selection:bg-indigo-500 selection:text-white">
      {/* Toast system */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* TOP HEADER */}
      <Header isAdmin={isAdmin} onToggleAdmin={handleToggleAdmin} user={user} />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col">
        {currentTab === 'home' && (
          <HomeView
            onOpenTemplateSelector={() => setIsTemplateModalOpen(true)}
            onUploadCustomMeme={handleUploadCustomMeme}
            approvedCount={memesState.approved.length}
            pendingCount={memesState.pending.length}
            recentMemes={memesState.approved}
            onSelectMemeForViewing={() => setCurrentTab('gallery')}
          />
        )}

        {currentTab === 'editor' && (
          <EditorView
            templateUrl={currentTemplateUrl || DEFAULT_TEMPLATES[0].url}
            onOpenTemplateSelector={() => setIsTemplateModalOpen(true)}
            onSubmitForReview={handleSubmitForReview}
          />
        )}

        {currentTab === 'gallery' && (
          <GalleryView
            memes={memesState.approved}
            onCreateMemeClick={() => setCurrentTab('editor')}
            onDownloadMeme={handleDownloadMeme}
          />
        )}

        {currentTab === 'admin' && isAdmin && (
          <AdminView
            pendingMemes={memesState.pending}
            approvedMemes={memesState.approved}
            templates={templates}
            adminIds={Array.from(new Set([...PRIMARY_ADMIN_IDS, ...adminIds]))}
            serverConnected={serverConnected}
            onApproveMeme={handleApproveMeme}
            onToggleAnonymity={handleToggleAnonymity}
            onRejectMeme={handleRejectMeme}
            onAddTemplate={handleAddTemplate}
            onRenameTemplate={handleRenameTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onResetTemplates={handleResetTemplates}
            onAddAdminId={handleAddAdminId}
            onRemoveAdminId={handleRemoveAdminId}
            onManualSyncRefresh={() => syncFromServer(true)}
            onImportSyncPayload={handleImportSyncPayload}
            onExportSyncPayload={handleExportSyncPayload}
          />
        )}
      </main>

      {/* TEMPLATE SELECTOR MODAL */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* BOTTOM NAVIGATION BAR */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isAdmin={isAdmin}
        pendingCount={memesState.pending.length}
      />
    </div>
  );
};
