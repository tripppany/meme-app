import React, { useState, useRef } from 'react';
import { MemeItem, MemeTemplate } from '../types/meme';
import { PRIMARY_ADMIN_IDS } from '../constants/templates';
import { ConfirmModal } from './ConfirmModal';
import { telegramHaptic } from '../services/telegram';

interface AdminViewProps {
  pendingMemes: MemeItem[];
  approvedMemes: MemeItem[];
  templates: MemeTemplate[];
  adminIds: number[];
  serverConnected: boolean;
  onApproveMeme: (id: string, isAnonymous?: boolean) => void;
  onToggleAnonymity: (id: string, explicitAnonymity?: boolean) => void;
  onRejectMeme: (id: string) => void;
  onAddTemplate: (title: string, dataUrl: string) => void;
  onRenameTemplate: (id: string, newTitle: string) => void;
  onDeleteTemplate: (id: string) => void;
  onResetTemplates: () => void;
  onAddAdminId: (id: number) => void;
  onRemoveAdminId: (id: number) => void;
  onManualSyncRefresh: () => void;
  onImportSyncPayload: (jsonString: string) => boolean;
  onExportSyncPayload: () => string;
}

export const AdminView: React.FC<AdminViewProps> = ({
  pendingMemes,
  approvedMemes,
  templates,
  adminIds,
  serverConnected,
  onApproveMeme,
  onToggleAnonymity,
  onRejectMeme,
  onAddTemplate,
  onRenameTemplate,
  onDeleteTemplate,
  onResetTemplates,
  onAddAdminId,
  onRemoveAdminId,
  onManualSyncRefresh,
  onImportSyncPayload,
  onExportSyncPayload,
}) => {
  // New template form state
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [templateUrlInput, setTemplateUrlInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  // Template rename state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Confirmation modal state (non-blocking for Telegram)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Sync section state
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const syncFileImportRef = useRef<HTMLInputElement>(null);

  // New admin ID state
  const [newAdminIdInput, setNewAdminIdInput] = useState('');

  const handleTemplateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setTemplateImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = () => {
    const title = templateTitle.trim();
    const finalImage = uploadMode === 'url' ? templateUrlInput.trim() : templateImage;

    if (!title || !finalImage) {
      setSyncFeedback({ type: 'error', text: 'Укажите название и выберите изображение или URL' });
      telegramHaptic('error');
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    onAddTemplate(title, finalImage);
    telegramHaptic('success');
    setTemplateTitle('');
    setTemplateImage(null);
    setTemplateUrlInput('');
    if (templateFileInputRef.current) templateFileInputRef.current.value = '';
  };

  const handleStartRename = (t: MemeTemplate) => {
    telegramHaptic('light');
    setEditingTemplateId(t.id);
    setEditingTitle(t.title);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setSyncFeedback({ type: 'error', text: 'Название шаблона не может быть пустым' });
      telegramHaptic('error');
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }
    onRenameTemplate(id, trimmed);
    telegramHaptic('success');
    setEditingTemplateId(null);
  };

  const handleAddAdmin = () => {
    const val = parseInt(newAdminIdInput.trim());
    if (!val || isNaN(val)) {
      setSyncFeedback({ type: 'error', text: 'Введите корректный числовой Telegram ID' });
      telegramHaptic('error');
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }
    onAddAdminId(val);
    telegramHaptic('success');
    setNewAdminIdInput('');
  };

  // Export copy
  const handleCopySyncCode = () => {
    const payload = onExportSyncPayload();
    navigator.clipboard.writeText(payload);
    setSyncFeedback({ type: 'success', text: 'Код синхронизации скопирован в буфер обмена!' });
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Download json backup file
  const handleDownloadBackupFile = () => {
    const payload = onExportSyncPayload();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meme_sync_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncFeedback({ type: 'success', text: 'Файл синхронизации скачан!' });
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Import sync from code
  const handleApplySyncCode = () => {
    if (!syncCodeInput.trim()) {
      setSyncFeedback({ type: 'error', text: 'Вставьте код синхронизации' });
      return;
    }
    const success = onImportSyncPayload(syncCodeInput.trim());
    if (success) {
      setSyncCodeInput('');
      setSyncFeedback({ type: 'success', text: 'Данные успешно синхронизированы!' });
    } else {
      setSyncFeedback({ type: 'error', text: 'Ошибка: некорректный формат кода' });
    }
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Import sync from file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = onImportSyncPayload(content);
        if (success) {
          setSyncFeedback({ type: 'success', text: 'Файл успешно загружен и применен!' });
        } else {
          setSyncFeedback({ type: 'error', text: 'Ошибка: поврежденный файл конфигурации' });
        }
        setTimeout(() => setSyncFeedback(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadPendingMeme = (meme: MemeItem) => {
    const a = document.createElement('a');
    a.href = meme.dataUrl;
    a.download = `pending_meme_${meme.id}_${Date.now()}.png`;
    a.click();
  };

  return (
    <section className="space-y-6 pb-6 animate-in fade-in duration-200">
      {/* Admin Banner & Cross-Device Status */}
      <div className="bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-purple-500/15 border border-amber-500/30 rounded-2xl p-3.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
            <i className="fa-solid fa-shield-cat text-lg"></i>
            <span>Панель администратора беседы</span>
          </div>
          <span className="text-[10px] bg-amber-500 text-slate-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
            МОДЕРАЦИЯ
          </span>
        </div>

        {/* Sync Status Banner */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                serverConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className={serverConnected ? 'text-emerald-300 font-medium' : 'text-slate-300'}>
              {serverConnected
                ? 'Синхронизация со всеми устройствами активна'
                : 'Автономный режим (локальное хранилище)'}
            </span>
          </div>
          <button
            onClick={onManualSyncRefresh}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold px-2 py-1 rounded-lg border border-slate-700 flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <i className="fa-solid fa-rotate text-[10px]"></i>
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Admin Feature 1: Управление шаблонами (Добавление и удаление) */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-4 shadow-md">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
            <i className="fa-solid fa-folder-plus"></i> Управление шаблонами
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Всего: <b className="text-white">{templates.length}</b>
          </span>
        </div>

        {/* Add Template Section */}
        <div className="space-y-3 pb-3 border-b border-slate-700/60 bg-slate-900/40 p-3 rounded-xl border border-slate-700/40">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-300">Добавить новый шаблон</span>
            <div className="flex gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`px-2 py-0.5 rounded-md transition ${
                  uploadMode === 'file'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Файл
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`px-2 py-0.5 rounded-md transition ${
                  uploadMode === 'url'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ссылка / URL
              </button>
            </div>
          </div>

          <input
            type="text"
            value={templateTitle}
            onChange={(e) => setTemplateTitle(e.target.value)}
            placeholder="Название шаблона (например: 'Кот в шоке')"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
          />

          {uploadMode === 'file' ? (
            <div className="flex gap-2">
              <label className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-center text-slate-200 cursor-pointer transition flex items-center justify-center gap-1.5 active:scale-95">
                <i className="fa-solid fa-upload"></i> Выбрать картинку
                <input
                  type="file"
                  ref={templateFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleTemplateFile}
                />
              </label>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-xl transition active:scale-95 shadow-md shadow-amber-500/20"
              >
                Добавить
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={templateUrlInput}
                onChange={(e) => setTemplateUrlInput(e.target.value)}
                placeholder="Вставьте ссылку на изображение (https://...)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-xl transition active:scale-95"
              >
                Добавить
              </button>
            </div>
          )}

          {templateImage && uploadMode === 'file' && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 pt-1">
              <i className="fa-solid fa-check"></i>
              <span>Картинка загружена: {templateTitle || 'готов к добавлению'}</span>
            </div>
          )}
        </div>

        {/* List & Delete Templates */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
            <span>Список шаблонов (можно удалить любой):</span>
            <button
              type="button"
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Сброс шаблонов',
                  message: 'Восстановить исходный набор базовых шаблонов?',
                  confirmText: 'Восстановить',
                  isDanger: false,
                  onConfirm: () => {
                    onResetTemplates();
                    telegramHaptic('success');
                    setConfirmModal(null);
                  },
                });
              }}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              Восстановить базовые
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {templates.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-900/50 rounded-xl">
                Шаблонов нет. Добавьте новый или восстановите базовые.
              </div>
            ) : (
              templates.map((t) => {
                const isEditing = editingTemplateId === t.id;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-slate-900 border border-slate-700/70 hover:border-slate-600 rounded-xl p-2.5 transition"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden flex-1 min-w-0">
                      <img
                        src={t.url}
                        alt={t.title}
                        className="w-10 h-10 rounded-lg object-contain flex-shrink-0 bg-slate-950 border border-slate-800"
                      />

                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-1.5 mr-2">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(t.id);
                              if (e.key === 'Escape') setEditingTemplateId(null);
                            }}
                            className="w-full bg-slate-950 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                            placeholder="Новое название..."
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(t.id)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition shrink-0"
                            title="Сохранить"
                          >
                            <i className="fa-solid fa-check text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTemplateId(null)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition shrink-0"
                            title="Отмена"
                          >
                            <i className="fa-solid fa-xmark text-xs"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="truncate flex-1 min-w-0 pr-1">
                          <span className="text-xs text-slate-100 font-bold block truncate">
                            {t.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {t.isCustom ? 'Пользовательский' : 'Стандартный'} • Синхронизирован
                          </span>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => handleStartRename(t)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 p-2 rounded-lg hover:bg-indigo-500/10 transition cursor-pointer"
                          title="Переименовать шаблон"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Удаление шаблона',
                              message: `Удалить шаблон "${t.title}" со всех устройств?`,
                              confirmText: 'Удалить',
                              isDanger: true,
                              onConfirm: () => {
                                onDeleteTemplate(t.id);
                                telegramHaptic('medium');
                                setConfirmModal(null);
                              },
                            });
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                          title="Удалить шаблон со всех устройств"
                        >
                          <i className="fa-solid fa-trash text-sm"></i>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Admin Feature 2: Синхронизация со всеми устройствами */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3 shadow-md">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
            <i className="fa-solid fa-network-wired"></i> Синхронизация со всеми устройствами
          </h3>
          <button
            onClick={() => setShowSyncDetails(!showSyncDetails)}
            className="text-xs text-indigo-300 hover:text-white"
          >
            {showSyncDetails ? 'Скрыть детали' : 'Настройки'}
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Все добавленные и удаленные шаблоны, а также мемы автоматически синхронизируются через сервер приложения при каждом изменении.
        </p>

        {syncFeedback && (
          <div
            className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            <i
              className={`fa-solid ${
                syncFeedback.type === 'success' ? 'fa-check' : 'fa-circle-exclamation'
              }`}
            ></i>
            <span>{syncFeedback.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCopySyncCode}
            className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <i className="fa-solid fa-copy text-amber-400"></i> Скопировать код
          </button>

          <button
            onClick={handleDownloadBackupFile}
            className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <i className="fa-solid fa-download text-emerald-400"></i> Скачать файл .json
          </button>
        </div>

        {showSyncDetails && (
          <div className="space-y-3 pt-3 border-t border-slate-700 animate-in fade-in">
            <label className="block text-[11px] font-semibold text-slate-400">
              Ручной перенос / Импорт данных с другого устройства:
            </label>
            <div className="space-y-2">
              <textarea
                value={syncCodeInput}
                onChange={(e) => setSyncCodeInput(e.target.value)}
                placeholder="Вставьте сюда код синхронизации..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleApplySyncCode}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
                >
                  Применить код
                </button>

                <label className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition flex items-center justify-center gap-1">
                  <i className="fa-solid fa-file-import"></i> Файл
                  <input
                    type="file"
                    ref={syncFileImportRef}
                    accept=".json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Feature 3: Manage Admin Users */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3 shadow-md">
        <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
          <i className="fa-solid fa-user-shield"></i> Управление администраторами
        </h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              value={newAdminIdInput}
              onChange={(e) => setNewAdminIdInput(e.target.value)}
              placeholder="Telegram ID (например: 502413224)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleAddAdmin}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 active:scale-95"
            >
              <i className="fa-solid fa-plus"></i> Добавить
            </button>
          </div>

          <div className="pt-2">
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
              Список Telegram ID администраторов:
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {adminIds.map((id) => {
                const isPrimary = PRIMARY_ADMIN_IDS.includes(id);
                return (
                  <div
                    key={id}
                    className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-xl text-xs border border-slate-800"
                  >
                    <span className="text-slate-300 font-mono flex items-center gap-2">
                      <i className="fa-brands fa-telegram text-indigo-400"></i>
                      {id}
                      {isPrimary && (
                        <span className="text-[10px] text-amber-400 font-sans font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          (Главный)
                        </span>
                      )}
                    </span>
                    {!isPrimary && (
                      <button
                        onClick={() => onRemoveAdminId(id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="Удалить администратора"
                      >
                        <i className="fa-solid fa-xmark text-sm"></i>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Feature 4: Pending Queue */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-md text-slate-200 flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-amber-400"></i>
            Очередь мемов на проверку
          </h3>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-700">
            {pendingMemes.length} в ожидании
          </span>
        </div>

        {pendingMemes.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500 bg-slate-800/40 rounded-2xl border border-slate-800">
            <i className="fa-solid fa-circle-check text-4xl text-emerald-500/60 mb-2 block"></i>
            <p className="text-xs font-semibold text-slate-300 mb-1">Очередь пуста!</p>
            <p className="text-[11px] text-slate-500">Все предложенные мемы проверены.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingMemes.map((meme) => (
              <div
                key={meme.id}
                className="bg-slate-800 border border-slate-700/80 rounded-2xl p-3 flex flex-col gap-3 shadow-lg"
              >
                <div className="relative group rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 max-h-72">
                  <img
                    src={meme.dataUrl}
                    alt={`Pending meme by ${meme.author}`}
                    className="max-h-72 w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => handleDownloadPendingMeme(meme)}
                    className="absolute top-2 right-2 p-2 bg-slate-900/80 hover:bg-slate-900 text-amber-400 hover:text-amber-300 rounded-lg backdrop-blur-sm border border-slate-700/60 transition shadow-md active:scale-95 cursor-pointer"
                    title="Скачать изображение"
                  >
                    <i className="fa-solid fa-download text-xs"></i>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400">
                    От: <b className="text-amber-400">{meme.author}</b>
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => handleDownloadPendingMeme(meme)}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                      title="Скачать картинку до одобрения"
                    >
                      <i className="fa-solid fa-download text-amber-400"></i>
                      <span className="hidden sm:inline">Скачать</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onApproveMeme(meme.id, false)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
                      title="Одобрить с отображением автора"
                    >
                      <i className="fa-solid fa-check"></i>
                      <span>Одобрить</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onApproveMeme(meme.id, true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-900 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
                      title="Одобрить анонимно (автор будет скрыт, но сохранится)"
                    >
                      <i className="fa-solid fa-user-secret"></i>
                      <span>Анонимно</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRejectMeme(meme.id)}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-md shadow-rose-600/20 cursor-pointer"
                      title="Отклонить"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Feature 5: Опубликованные мемы (Управление видимостью автора) */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3 shadow-md">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
            <i className="fa-solid fa-user-secret"></i> Видимость авторов опубликованных мемов
          </h3>
          <span className="text-xs bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-800 font-semibold">
            {approvedMemes.length} в галерее
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Вы можете переключать видимость автора для любого опубликованного мема: сделать его анонимным или снова показать автора в любой момент.
        </p>

        {approvedMemes.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-900/40 rounded-xl">
            В галерее пока нет опубликованных мемов.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {approvedMemes.map((m) => {
              const authorToDisplay = m.realAuthor || m.author;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-700/70 hover:border-slate-600 rounded-xl p-2.5 transition gap-2"
                >
                  <div className="flex items-center space-x-3 overflow-hidden min-w-0 flex-1">
                    <img
                      src={m.dataUrl}
                      alt="Meme"
                      className="w-10 h-10 rounded-lg object-contain bg-slate-950 border border-slate-800 shrink-0"
                    />
                    <div className="truncate text-xs">
                      {m.isAnonymous ? (
                        <div>
                          <span className="font-bold text-amber-400 flex items-center gap-1.5">
                            <i className="fa-solid fa-user-secret text-xs"></i>
                            <span>Анонимный мем</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            Скрытый автор: <b className="text-slate-300">{authorToDisplay}</b>
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="text-slate-200 truncate">
                            <span className="text-slate-400">Автор: </span>
                            <b className="text-indigo-300">{m.author}</b>
                          </div>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <i className="fa-solid fa-eye text-[9px]"></i>
                            <span>Имя автора видно всем</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual Segmented Anonymity Switch */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleAnonymity(m.id, false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        !m.isAnonymous
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Показать реального автора в галерее"
                    >
                      <i className="fa-solid fa-user text-[10px]"></i>
                      <span>Автор</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleAnonymity(m.id, true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        m.isAnonymous
                          ? 'bg-amber-500 text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Сделать мем анонимным в галерее"
                    >
                      <i className="fa-solid fa-user-secret text-[10px]"></i>
                      <span>Анонимно</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Non-blocking Telegram-compatible Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmModal?.isOpen)}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmText={confirmModal?.confirmText}
        isDanger={confirmModal?.isDanger}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
      />
    </section>
  );
};
