import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasLayer, TextLayer, ImageLayer } from '../types/meme';
import { telegramHaptic } from '../services/telegram';

interface EditorViewProps {
  templateUrl: string;
  onOpenTemplateSelector: () => void;
  onSubmitForReview: (dataUrl: string) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  templateUrl,
  onOpenTemplateSelector,
  onSubmitForReview,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(-1);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Load background image whenever templateUrl changes
  useEffect(() => {
    if (!templateUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBackgroundImage(img);
      // Reset layers to standard top/bottom text
      const initialLayers: CanvasLayer[] = [
        {
          id: 'text-top',
          type: 'text',
          text: 'ВЕРХНИЙ ТЕКСТ',
          x: 250,
          y: 60,
          fontSize: 36,
          color: '#ffffff',
          strokeColor: '#000000',
        },
        {
          id: 'text-bottom',
          type: 'text',
          text: 'НИЖНИЙ ТЕКСТ',
          x: 250,
          y: 440,
          fontSize: 36,
          color: '#ffffff',
          strokeColor: '#000000',
        },
      ];
      setLayers(initialLayers);
      setSelectedLayerIndex(0);
    };
    img.src = templateUrl;
  }, [templateUrl]);

  // Redraw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw layers
    layers.forEach((layer, index) => {
      if (layer.type === 'text') {
        ctx.font = `900 ${layer.fontSize}px Impact, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = layer.strokeColor;
        ctx.lineWidth = Math.max(3, layer.fontSize / 10);
        ctx.strokeText(layer.text, layer.x, layer.y);

        ctx.fillStyle = layer.color;
        ctx.fillText(layer.text, layer.x, layer.y);

        // Selection highlight
        if (index === selectedLayerIndex) {
          const metrics = ctx.measureText(layer.text);
          const w = metrics.width + 16;
          const h = layer.fontSize + 12;

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(layer.x - w / 2, layer.y - h / 2, w, h);
          ctx.setLineDash([]);
        }
      } else if (layer.type === 'image') {
        ctx.drawImage(
          layer.img,
          layer.x - layer.width / 2,
          layer.y - layer.height / 2,
          layer.width,
          layer.height
        );

        // Selection highlight
        if (index === selectedLayerIndex) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(
            layer.x - layer.width / 2,
            layer.y - layer.height / 2,
            layer.width,
            layer.height
          );
          ctx.setLineDash([]);
        }
      }
    });
  }, [backgroundImage, layers, selectedLayerIndex]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Coordinate conversion helper
  const getCanvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(clientX, clientY);

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.type === 'text') {
        ctx.font = `900 ${layer.fontSize}px Impact, sans-serif`;
        const metrics = ctx.measureText(layer.text);
        const w = metrics.width + 20;
        const h = layer.fontSize + 16;

        if (
          pos.x >= layer.x - w / 2 &&
          pos.x <= layer.x + w / 2 &&
          pos.y >= layer.y - h / 2 &&
          pos.y <= layer.y + h / 2
        ) {
          setSelectedLayerIndex(i);
          isDraggingRef.current = true;
          dragOffsetRef.current = { x: pos.x - layer.x, y: pos.y - layer.y };
          return;
        }
      } else if (layer.type === 'image') {
        if (
          pos.x >= layer.x - layer.width / 2 &&
          pos.x <= layer.x + layer.width / 2 &&
          pos.y >= layer.y - layer.height / 2 &&
          pos.y <= layer.y + layer.height / 2
        ) {
          setSelectedLayerIndex(i);
          isDraggingRef.current = true;
          dragOffsetRef.current = { x: pos.x - layer.x, y: pos.y - layer.y };
          return;
        }
      }
    }

    // Clicked empty space
    setSelectedLayerIndex(-1);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || selectedLayerIndex < 0 || selectedLayerIndex >= layers.length)
      return;

    const pos = getCanvasPos(clientX, clientY);
    const newLayers = [...layers];
    const target = newLayers[selectedLayerIndex];
    target.x = Math.round(pos.x - dragOffsetRef.current.x);
    target.y = Math.round(pos.y - dragOffsetRef.current.y);
    setLayers(newLayers);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Add text layer
  const handleAddText = () => {
    const newTextLayer: TextLayer = {
      id: 'text-' + Date.now(),
      type: 'text',
      text: 'НОВЫЙ ТЕКСТ',
      x: 250,
      y: 250,
      fontSize: 34,
      color: '#ffffff',
      strokeColor: '#000000',
    };
    telegramHaptic('light');
    setLayers((prev) => [...prev, newTextLayer]);
    setSelectedLayerIndex(layers.length);
  };

  // Add overlay image layer
  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const newImageLayer: ImageLayer = {
          id: 'img-' + Date.now(),
          type: 'image',
          img: img,
          dataUrl: result,
          x: 250,
          y: 250,
          width: 120,
          height: 120,
        };
        telegramHaptic('light');
        setLayers((prev) => [...prev, newImageLayer]);
        setSelectedLayerIndex(layers.length);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Delete selected layer
  const handleDeleteLayer = () => {
    if (selectedLayerIndex < 0 || selectedLayerIndex >= layers.length) return;
    telegramHaptic('medium');
    setLayers((prev) => prev.filter((_, idx) => idx !== selectedLayerIndex));
    setSelectedLayerIndex(-1);
  };

  // Update selected layer attributes
  const updateSelectedText = (updates: Partial<TextLayer>) => {
    if (selectedLayerIndex < 0 || selectedLayerIndex >= layers.length) return;
    setLayers((prev) => {
      const next = [...prev];
      const current = next[selectedLayerIndex];
      if (current.type === 'text') {
        next[selectedLayerIndex] = { ...current, ...updates };
      }
      return next;
    });
  };

  // Quick positioning helpers
  const handleQuickAlign = (position: 'top' | 'middle' | 'bottom' | 'center') => {
    if (selectedLayerIndex < 0 || selectedLayerIndex >= layers.length) return;
    setLayers((prev) => {
      const next = [...prev];
      const layer = { ...next[selectedLayerIndex] };
      if (position === 'top') layer.y = 60;
      if (position === 'middle') layer.y = 250;
      if (position === 'bottom') layer.y = 440;
      if (position === 'center') layer.x = 250;
      next[selectedLayerIndex] = layer;
      return next;
    });
  };

  // Submit action
  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Temporarily deselect layer to hide bounding outline in exported PNG
    const prevSelected = selectedLayerIndex;
    setSelectedLayerIndex(-1);

    // Let React render clean canvas once then export
    requestAnimationFrame(() => {
      const cleanCanvas = canvasRef.current;
      if (!cleanCanvas) return;
      const dataUrl = cleanCanvas.toDataURL('image/png');
      telegramHaptic('success');
      onSubmitForReview(dataUrl);
      setSelectedLayerIndex(prevSelected);
    });
  };

  // Download local copy
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prevSelected = selectedLayerIndex;
    setSelectedLayerIndex(-1);

    requestAnimationFrame(() => {
      const cleanCanvas = canvasRef.current;
      if (!cleanCanvas) return;
      const dataUrl = cleanCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `meme_${Date.now()}.png`;
      a.click();
      telegramHaptic('success');
      setSelectedLayerIndex(prevSelected);
    });
  };

  const selectedLayer = selectedLayerIndex >= 0 ? layers[selectedLayerIndex] : null;

  return (
    <section className="space-y-4 pb-6 animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-1">
        <h2 className="font-bold text-lg flex items-center gap-2 text-white">
          <i className="fa-solid fa-pen-to-square text-amber-400"></i> Редактор
        </h2>
        <button
          onClick={onOpenTemplateSelector}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
        >
          <i className="fa-solid fa-images text-indigo-400"></i>
          <span>Сменить шаблон</span>
        </button>
      </div>

      {/* Canvas Container */}
      <div className="relative w-full flex justify-center bg-slate-950 rounded-2xl p-2 border border-slate-800 min-h-[280px] items-center overflow-hidden shadow-xl">
        <canvas
          id="memeCanvas"
          ref={canvasRef}
          width={500}
          height={500}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handlePointerDown(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            handlePointerMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handlePointerUp}
          className="rounded-xl touch-none cursor-grab active:cursor-grabbing max-w-full h-auto"
        />
      </div>

      <div className="text-center text-[11px] text-slate-400">
        💡 Нажимай на текст на картинке и перетаскивай его пальцем или мышкой!
      </div>

      {/* Control Accordions / Inputs */}
      <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-3 shadow-md">
        {/* Add Layer Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleAddText}
            className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <i className="fa-solid fa-font"></i> Добавить Текст
          </button>

          <label className="py-2.5 bg-slate-700 hover:bg-slate-600 text-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 shadow-md">
            <i className="fa-solid fa-image"></i> Наложить Фото
            <input
              type="file"
              ref={overlayInputRef}
              accept="image/*"
              onChange={handleOverlayUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Selected Element Customizer */}
        {selectedLayer ? (
          <div className="pt-3 border-t border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <i className="fa-solid fa-sliders"></i>
                {selectedLayer.type === 'text' ? 'Текстовый слой' : 'Картинка-наложение'}
              </span>
              <button
                onClick={handleDeleteLayer}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 transition"
              >
                <i className="fa-solid fa-trash text-[11px]"></i> Удалить объект
              </button>
            </div>

            {selectedLayer.type === 'text' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Текст надписи
                  </label>
                  <input
                    type="text"
                    value={selectedLayer.text}
                    onChange={(e) => updateSelectedText({ text: e.target.value })}
                    placeholder="Введите текст..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                      <span>Размер шрифта</span>
                      <span className="text-indigo-400">{selectedLayer.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="90"
                      value={selectedLayer.fontSize}
                      onChange={(e) => updateSelectedText({ fontSize: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Цвет / Обводка
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                        <input
                          type="color"
                          value={selectedLayer.color}
                          onChange={(e) => updateSelectedText({ color: e.target.value })}
                          className="h-6 w-7 rounded cursor-pointer bg-transparent border-0"
                          title="Цвет текста"
                        />
                        <span className="text-[10px] text-slate-400">Текст</span>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                        <input
                          type="color"
                          value={selectedLayer.strokeColor}
                          onChange={(e) => updateSelectedText({ strokeColor: e.target.value })}
                          className="h-6 w-7 rounded cursor-pointer bg-transparent border-0"
                          title="Цвет обводки"
                        />
                        <span className="text-[10px] text-slate-400">Контур</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick alignment */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Быстрое выравнивание
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickAlign('top')}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-medium text-slate-300"
                    >
                      Вверх
                    </button>
                    <button
                      onClick={() => handleQuickAlign('middle')}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-medium text-slate-300"
                    >
                      Центр
                    </button>
                    <button
                      onClick={() => handleQuickAlign('bottom')}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-medium text-slate-300"
                    >
                      Вниз
                    </button>
                    <button
                      onClick={() => handleQuickAlign('center')}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-medium text-slate-300"
                    >
                      По центру X
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-slate-400">
            Нажмите на надпись на холсте для редактирования
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-white rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <i className="fa-solid fa-paper-plane"></i>
          <span>Отправить на модерацию</span>
        </button>

        <button
          onClick={handleDownload}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-slate-200 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer text-xs"
        >
          <i className="fa-solid fa-download"></i>
          <span>Сохранить на устройство (PNG)</span>
        </button>
      </div>
    </section>
  );
};
