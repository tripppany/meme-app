import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MemeItem, MemeTemplate, TelegramUser } from './types/meme';
import { DEFAULT_TEMPLATES, PRIMARY_ADMIN_IDS, INITIAL_APPROVED_MEMES } from './constants/templates';
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
import {
  testConnection,
  subscribeToFirestoreTemplates,
  subscribeToFirestorePendingMemes,
  subscribeToFirestoreApprovedMemes,
  seedFirestoreIfEmpty,
  addFirestoreTemplate,
  updateFirestoreTemplate,
  deleteFirestoreTemplate,
  submitFirestoreMeme,
  approveFirestoreMeme,
  rejectFirestoreMeme,
  deleteFirestoreApprovedMeme,
} from './services/firebaseSync';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { EditorView } from './components/EditorView';
import { GalleryView } from './components/GalleryView';
import { AdminView } from './components/AdminView';
import { TemplateModal } from './components/TemplateModal';
import { Toast, ToastMessage } from './components/Toast';
import { initTelegram, telegramHaptic, setTelegramBackButton } from './services/telegram';

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

  // Continuous Real-Time Synchronization across ALL devices
  const isInitialMount = useRef(true);
  const isSyncing = useRef(false);
  const lastModifiedRef = useRef<number>(0);

  const safeSync = useCallback(async (notify = false) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
      await syncFromServer(notify);
    } finally {
      isSyncing.current = false;
    }
  }, [syncFromServer]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      safeSync();
      // Test Firestore connection & seed templates/memes if first boot
      testConnection().catch(() => {});
      seedFirestoreIfEmpty(DEFAULT_TEMPLATES, INITIAL_APPROVED_MEMES).catch(() => {});
    }

    // 1. Direct Cloud Firestore Real-Time Snapshot Sync (Works 24/7 on GitHub Pages & Telegram!)
    let unsubFirestoreTemplates: (() => void) | null = null;
    let unsubFirestorePending: (() => void) | null = null;
    let unsubFirestoreApproved: (() => void) | null = null;

    try {
      unsubFirestoreTemplates = subscribeToFirestoreTemplates((cloudTemplates) => {
        if (cloudTemplates && cloudTemplates.length > 0) {
          setTemplates(cloudTemplates);
          saveAllTemplates(cloudTemplates);
          setServerConnected(true);
        }
      });

      unsubFirestorePending = subscribeToFirestorePendingMemes((cloudPending) => {
        setMemesState((prev) => {
          const next = { ...prev, pending: cloudPending };
          saveMemesState(next);
          return next;
        });
      });

      unsubFirestoreApproved = subscribeToFirestoreApprovedMemes((cloudApproved) => {
        setMemesState((prev) => {
          const next = { ...prev, approved: cloudApproved };
          saveMemesState(next);
          return next;
        });
      });
    } catch (e) {
      console.warn('Firestore subscription error:', e);
    }

    // 2. Instant Real-Time Push Stream via Server-Sent Events (SSE) (for Express server mode)
    const unsubscribeSSE = api.subscribeToEvents((data) => {
      if (data?.lastModified && data.lastModified !== lastModifiedRef.current) {
        lastModifiedRef.current = data.lastModified;
        safeSync();
      }
    });

    // 3. Continuous background heartbeat (every 3s)
    const pollInterval = setInterval(async () => {
      try {
        const status = await api.getStatus();
        if (status) {
          setServerConnected(true);
          if (status.lastModified && status.lastModified !== lastModifiedRef.current) {
            lastModifiedRef.current = status.lastModified;
            safeSync();
          }
        }
      } catch {
        // network hiccup, fallback safely
      }
    }, 3000);

    // 4. Refresh immediately when window or Telegram app regains focus
    const handleFocus = () => {
      safeSync();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    // 5. BroadcastChannel for instant cross-tab sync within the same browser
    const unsubscribeChannel = subscribeToSyncChannel(() => {
      setTemplates(loadAllTemplates());
      setMemesState(loadMemesState());
      setAdminIds(loadAdminIds());
    });

    return () => {
      clearInterval(pollInterval);
      if (unsubFirestoreTemplates) unsubFirestoreTemplates();
      if (unsubFirestorePending) unsubFirestorePending();
      if (unsubFirestoreApproved) unsubFirestoreApproved();
      unsubscribeSSE();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      unsubscribeChannel();
    };
  }, [safeSync]);

  // Initialize Telegram WebApp & user access
  useEffect(() => {
    try {
      const preloader = document.getElementById('preloader');
      if (preloader) {
        preloader.remove();
      }
    } catch {
      // ignore
    }

    const tgUser = initTelegram((detectedUser) => {
      setUser(detectedUser);
    });
    if (tgUser) {
      setUser(tgUser);
    }
  }, []);

  // Telegram Native BackButton integration
  useEffect(() => {
    const shouldShowBack = currentTab !== 'home' || isTemplateModalOpen;
    const handleBack = () => {
      telegramHaptic('light');
      if (isTemplateModalOpen) {
        setIsTemplateModalOpen(false);
      } else if (currentTab !== 'home') {
        setCurrentTab('home');
      }
    };
    const cleanup = setTelegramBackButton(shouldShowBack, handleBack);
    return cleanup;
  }, [currentTab, isTemplateModalOpen]);

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
    telegramHaptic('medium');
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
      id: 'meme-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
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

    // 1. Direct Cloud Firestore Push (Instant cross-device sync for Telegram & GitHub Pages)
    submitFirestoreMeme(newMeme).catch((e) => {
      console.warn('Firestore submit error:', e);
    });

    // 2. Express Backend API call (if running)
    try {
      await api.submitMeme(dataUrl, authorTag);
    } catch (e) {
      console.warn('Server offline, saved locally/cloud:', e);
    }

    addToast('success', 'Мем отправлен на модерацию!');
    setCurrentTab('home');
  };

  // Approve meme (with optional anonymity)
  const handleApproveMeme = async (id: string, isAnonymous = false) => {
    let approvedMemeItem: MemeItem | null = null;
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
      approvedMemeItem = approvedMeme;
      const next = {
        pending: prev.pending.filter((m) => m.id !== id),
        approved: [approvedMeme, ...prev.approved],
      };
      saveMemesState(next);
      return next;
    });

    // Cloud Firestore Sync
    if (approvedMemeItem) {
      approveFirestoreMeme(approvedMemeItem).catch((e) => {
        console.warn('Firestore approve error:', e);
      });
    }

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

    // Cloud Firestore Sync
    approveFirestoreMeme(updatedMeme).catch((e) => {
      console.warn('Firestore anonymity sync error:', e);
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

    // Cloud Firestore Sync
    rejectFirestoreMeme(id).catch((e) => {
      console.warn('Firestore reject error:', e);
    });

    try {
      await api.updateMemeStatus(id, 'rejected');
    } catch (e) {
      console.warn('API error:', e);
    }

    addToast('info', 'Мем отклонен');
  };

  // Delete meme from gallery and queue (Admin feature)
  const handleDeleteMeme = async (id: string) => {
    setMemesState((prev) => {
      const next = {
        pending: prev.pending.filter((m) => m.id !== id),
        approved: prev.approved.filter((m) => m.id !== id),
      };
      saveMemesState(next);
      return next;
    });

    // Cloud Firestore Sync: delete from approved and pending
    deleteFirestoreApprovedMeme(id).catch(() => {});
    rejectFirestoreMeme(id).catch(() => {});

    try {
      await api.deleteMeme(id);
    } catch (e) {
      console.warn('API delete meme error:', e);
    }

    addToast('info', 'Мем удален из галереи со всех устройств');
  };

  // Add custom template (Admin)
  const handleAddTemplate = async (title: string, dataUrl: string, isHidden = false) => {
    const localTemplate: MemeTemplate = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title,
      url: dataUrl,
      isCustom: true,
      isHidden: Boolean(isHidden),
      createdAt: Date.now(),
    };

    setTemplates((prev) => {
      const next = [localTemplate, ...prev];
      saveAllTemplates(next);
      return next;
    });

    // Cloud Firestore Sync (Instant template availability across all devices)
    addFirestoreTemplate(localTemplate).catch((e) => {
      console.warn('Firestore add template error:', e);
    });

    try {
      const remote = await api.addTemplate(title, dataUrl, isHidden);
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

    addToast(
      'success',
      isHidden
        ? `Шаблон "${title}" добавлен в скрытом режиме (черновик)`
        : `Шаблон "${title}" добавлен и синхронизирован!`
    );
  };

  // Toggle template visibility without deleting (Admin)
  const handleToggleTemplateVisibility = async (id: string, explicitHidden?: boolean) => {
    const target = templates.find((t) => t.id === id);
    if (!target) return;
    const nextHidden = explicitHidden !== undefined ? explicitHidden : !target.isHidden;

    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, isHidden: nextHidden } : t));
      saveAllTemplates(next);
      return next;
    });

    // Cloud Firestore Sync
    updateFirestoreTemplate(id, { isHidden: nextHidden }).catch((e) => {
      console.warn('Firestore update visibility error:', e);
    });

    try {
      await api.toggleTemplateVisibility(id, nextHidden);
    } catch (e) {
      console.warn('API toggle visibility error:', e);
    }

    addToast(
      'info',
      nextHidden
        ? `Шаблон "${target.title}" скрыт от остальных пользователей`
        : `Шаблон "${target.title}" снова виден всем!`
    );
  };

  // Rename ANY template (Admin)
  const handleRenameTemplate = async (id: string, newTitle: string) => {
    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t));
      saveAllTemplates(next);
      return next;
    });

    // Cloud Firestore Sync
    updateFirestoreTemplate(id, { title: newTitle }).catch((e) => {
      console.warn('Firestore rename error:', e);
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

    // Cloud Firestore Sync
    deleteFirestoreTemplate(id).catch((e) => {
      console.warn('Firestore delete template error:', e);
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
            isAdmin={isAdmin}
            onCreateMemeClick={() => setCurrentTab('editor')}
            onDownloadMeme={handleDownloadMeme}
            onDeleteMeme={handleDeleteMeme}
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
            onDeleteMeme={handleDeleteMeme}
            onAddTemplate={handleAddTemplate}
            onToggleTemplateVisibility={handleToggleTemplateVisibility}
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
        templates={isAdmin ? templates : templates.filter((t) => !t.isHidden)}
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
