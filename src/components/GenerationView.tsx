import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Group, Text, Circle } from 'react-konva';
import { Html } from 'react-konva-utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Loader2, 
  Download, 
  Trash2, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  Navigation, 
  Image as ImageIcon, 
  History, 
  Terminal, 
  Clock, 
  ChevronRight, 
  X,
  ChevronDown,
  Info,
  AlertCircle,
  RefreshCw,
  FileJson,
  Link as LinkIcon,
  Maximize2,
  Search
} from 'lucide-react';
import useImage from 'use-image';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";
import { useConfig } from '../hooks/useConfig';

interface CanvasItem {
  id: string;
  type?: 'image' | 'text';
  url?: string;
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  prompt: string;
  modelId: string;
}

const HEADER_HEIGHT = 24;

const PanelTextarea = ({ panel, updatePanel }: { panel: any, updatePanel: (id: string, updates: any) => void }) => {
  const [localVal, setLocalVal] = useState(panel.prompt);

  // Sync internal value if external prompt is cleared via successful generation
  useEffect(() => {
    setLocalVal(panel.prompt);
  }, [panel.prompt]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalVal(e.target.value);
    updatePanel(panel.id, { prompt: e.target.value });
  };

  return (
    <textarea
      value={localVal}
      onChange={handleChange}
      className="w-full h-24 bg-[#1e1e1e] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none resize-none custom-scrollbar"
      placeholder="描述画面内容..."
    />
  );
};

const URLImage = ({ item, isSelected, onSelect, onChange, onDragMove, onStartConnection, onDoubleClick }: { 
  item: CanvasItem; 
  isSelected: boolean; 
  onSelect: () => void;
  onChange: (newAttrs: any) => void;
  onDragMove?: () => void;
  onStartConnection?: (id: string, startPos: { x: number, y: number }) => void;
  onDoubleClick?: () => void;
}) => {
  const [image, status] = useImage(item.url || '', 'anonymous');
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const nodeWidth = item.width || 512;
  const nodeHeight = item.height || 512;

  const handleStartDragLine = (e: any) => {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (onStartConnection && pointerPos) {
      onStartConnection(item.id, pointerPos);
    }
  };

  return (
    <React.Fragment>
      <Group
        id={`image-${item.id}`}
        x={item.x}
        y={item.y}
        draggable
        onDragMove={(e) => {
          if (onDragMove) onDragMove();
        }}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
        onDragEnd={(e) => {
          onChange({
            ...item,
            x: e.target.x(),
            y: e.target.y(),
          });
          if (onDragMove) onDragMove();
        }}
      >
        {/* Node Base Frame */}
        <Rect
          width={nodeWidth}
          height={nodeHeight + HEADER_HEIGHT}
          fill="#18181b"
          cornerRadius={6}
          stroke={isSelected ? "#3b82f6" : "#27272a"}
          strokeWidth={isSelected ? 2 : 1}
          shadowColor="black"
          shadowBlur={isSelected ? 15 : 5}
          shadowOpacity={0.4}
        />

        {/* Node Header */}
        <Rect
          width={nodeWidth}
          height={HEADER_HEIGHT}
          fill={isSelected ? "#3b82f6" : "#27272a"}
          cornerRadius={[6, 6, 0, 0]}
        />
        <Text
          text={item.type === 'text' ? 'TEXT NODE' : 'IMAGE NODE'}
          x={10}
          y={6}
          fontSize={10}
          fontFamily="monospace"
          fontStyle="bold"
          fill="white"
          width={nodeWidth - 20}
        />

        {/* Output Port */}
        <Group x={nodeWidth} y={(nodeHeight + HEADER_HEIGHT) / 2}>
           <Circle
             radius={5}
             fill="#3b82f6"
             stroke="#18181b"
             strokeWidth={2}
           />
           <Circle
             radius={12}
             fill="transparent"
             onMouseDown={handleStartDragLine}
             onTouchStart={handleStartDragLine}
             onMouseEnter={(e: any) => {
               const container = e.target.getStage().container();
               container.style.cursor = 'crosshair';
             }}
             onMouseLeave={(e: any) => {
               const container = e.target.getStage().container();
               container.style.cursor = 'default';
             }}
           />
        </Group>

        <Group y={HEADER_HEIGHT}>
          {item.type === 'text' ? (
            <Group ref={shapeRef} width={nodeWidth} height={nodeHeight}>
              <Text
                text={item.text || ''}
                width={nodeWidth}
                height={nodeHeight}
                fill="#e4e4e7"
                fontSize={item.fontSize || 16}
                fontFamily="monospace"
                padding={12}
              />
            </Group>
          ) : (
            <React.Fragment>
              <KonvaImage
                ref={shapeRef}
                image={image}
                width={nodeWidth}
                height={nodeHeight}
                onTransformEnd={() => {
                  const node = shapeRef.current;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  node.scaleX(1);
                  node.scaleY(1);
                  onChange({
                    ...item,
                    width: Math.max(50, node.width() * scaleX),
                    height: Math.max(50, node.height() * scaleY),
                  });
                  if (onDragMove) onDragMove();
                }}
              />
              {/* Prompt Overlay */}
              {item.prompt && (
                <Html transform={true}>
                  <div 
                    style={{ 
                      width: nodeWidth,
                      pointerEvents: 'auto',
                      marginTop: nodeHeight,
                      userSelect: 'none'
                    }}
                    className="bg-zinc-900/95 backdrop-blur-sm text-zinc-400 text-[9px] px-3 py-2 hover:bg-black hover:text-white transition-all cursor-copy border-t border-zinc-800 line-clamp-2 w-full rounded-b-lg border-x border-b border-zinc-800/50 shadow-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(item.prompt);
                        const trigger = e.currentTarget;
                        const originalText = trigger.innerText;
                        trigger.innerText = '✅ 已复制提示词';
                        trigger.style.color = '#4ade80';
                        setTimeout(() => {
                           trigger.innerText = originalText;
                           trigger.style.color = '';
                        }, 2000);
                      }
                    }}
                    title="点击复制提示词"
                  >
                    {item.prompt}
                  </div>
                </Html>
              )}
            </React.Fragment>
          )}
        </Group>
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 50 || newBox.height < 50) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};


interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'error' | 'request' | 'response';
  message: string;
  details?: any;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  prompt: string;
  modelId: string;
  items: any[];
}

interface PanelState {
  id: string;
  prompt: string;
  ratio: string;
  resolution: string;
  count: number;
  referenceImageIds: string[];
  selectedModel: string;
  isGenerating: boolean;
  isPreviewOpen: boolean;
  x: number;
  y: number;
}

export default function GenerationView({ 
  showGlobalHistory, 
  showGlobalLogs, 
  onCloseLogs,
  onTaskComplete 
}: { 
  showGlobalHistory?: boolean; 
  showGlobalLogs?: boolean;
  onCloseLogs?: () => void;
  onTaskComplete?: () => void;
}) {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [panels, setPanels] = useState<PanelState[]>([
    {
      id: 'default-panel',
      prompt: "",
      ratio: "1:1",
      resolution: "1K",
      count: 1,
      referenceImageIds: [],
      selectedModel: "", // 初始为空，由逻辑自动解析默认模型
      isGenerating: false,
      isPreviewOpen: false,
      x: 32,
      y: 80
    }
  ]);

  const [activePanelId, setActivePanelId] = useState<string | null>('default-panel');
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  
  const [activeConnectingId, setActiveConnectingId] = useState<string | null>(null);
  const [dragMousePos, setDragMousePos] = useState({ x: 0, y: 0 });
  const [enlargedImageId, setEnlargedImageId] = useState<string | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{w: number, h: number} | null>(null);
  const [enlargedScale, setEnlargedScale] = useState(1);
  const [enlargedPos, setEnlargedPos] = useState({ x: 0, y: 0 });
  const [isDraggingEnlarged, setIsDraggingEnlarged] = useState(false);
  const [draggedRefItemId, setDraggedRefItemId] = useState<string | null>(null);
  const [dragOverRefItemId, setDragOverRefItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetPanelId, setUploadTargetPanelId] = useState<string | null>(null);


  const getAspectRatioStr = (w: number, h: number) => {
    const ratio = w / h;
    if (Math.abs(ratio - 1) < 0.01) return "1:1";
    if (Math.abs(ratio - 16/9) < 0.01) return "16:9";
    if (Math.abs(ratio - 9/16) < 0.01) return "9:16";
    if (Math.abs(ratio - 4/3) < 0.01) return "4:3";
    if (Math.abs(ratio - 3/4) < 0.01) return "3:4";
    if (Math.abs(ratio - 3/2) < 0.01) return "3:2";
    if (Math.abs(ratio - 2/3) < 0.01) return "2:3";
    if (Math.abs(ratio - 21/9) < 0.01) return "21:9";
    
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const common = gcd(Math.round(w), Math.round(h));
    return `${Math.round(w/common)}:${Math.round(h/common)}`;
  };
  
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgLinesRef = useRef<SVGGElement>(null);
  const { globalConfig, models, getEffectiveConfig } = useConfig();

  // 监听模型列表变化，确保所有面板都有有效的模型选择
  useEffect(() => {
    const imageModels = models.filter(m => m.category === 'Image');
    if (imageModels.length > 0) {
      setPanels(prev => prev.map(p => {
        if (!p.selectedModel || !models.find(m => m.id === p.selectedModel)) {
          return { ...p, selectedModel: imageModels[0].id };
        }
        return p;
      }));
    }
  }, [models]);
  
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStageDblClick = (e: any) => {
    const pos = stageRef.current?.getPointerPosition();
    if (pos) {
      addPanelAt(pos.x, pos.y);
    }
  };

  const addPanelAt = (x?: number, y?: number) => {
    let px = x;
    let py = y;
    if (px === undefined || py === undefined) {
      if (stageRef.current) {
        const stage = stageRef.current;
        const cx = -stage.x() / stage.scaleX() + stage.width() / 2 / stage.scaleX();
        const cy = -stage.y() / stage.scaleY() + stage.height() / 2 / stage.scaleY();
        px = cx - 160; // center panel (width ~320)
        py = cy - 200; // center panel (height ~400)
      } else {
        const lastPanel = panels[panels.length - 1];
        px = lastPanel ? lastPanel.x + 40 : 32;
        py = lastPanel ? lastPanel.y + 40 : 80;
      }
    }
    const newId = `panel-${Date.now()}`;
    setPanels(prev => [...prev, {
      ...prev[0], // inherit last used settings from the first panel/default
      id: newId,
      prompt: "",
      isGenerating: false,
      isPreviewOpen: false,
      referenceImageIds: [],
      x: px,
      y: py
    }]);
    setActivePanelId(newId);
  };

  const removePanel = (id: string) => {
    if (panels.length <= 1) return;
    setPanels(prev => prev.filter(p => p.id !== id));
    if (activePanelId === id) setActivePanelId(panels[0].id);
  };

  const updatePanel = useCallback((id: string, updates: Partial<PanelState>) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        if (selectedId && activePanelId) {
          const item = items.find(it => it.id === selectedId);
          if (item && item.type === 'image') {
            const panel = panels.find(p => p.id === activePanelId);
            if (panel && !panel.referenceImageIds.includes(selectedId)) {
              updatePanel(activePanelId, {
                referenceImageIds: [...panel.referenceImageIds, selectedId]
              });
              // Visual feedback
              const alertEl = document.createElement('div');
              alertEl.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-2xl z-[100] animate-bounce text-sm font-bold';
              alertEl.innerText = '已添加到参考图 ⚡';
              document.body.appendChild(alertEl);
              setTimeout(() => alertEl.remove(), 2000);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, activePanelId, items, panels, updatePanel]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();

    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
    };

    const SCALES = [0.1, 0.15, 0.2, 0.25, 0.33, 0.4, 0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8, 10];
    let newScale = oldScale;

    if (e.evt.deltaY > 0) { // Zoom out
      newScale = SCALES.slice().reverse().find(s => s < oldScale - 0.01) || Math.max(0.1, oldScale - 0.1);
    } else if (e.evt.deltaY < 0) { // Zoom in
      newScale = SCALES.find(s => s > oldScale + 0.01) || Math.min(10, oldScale + 0.1);
    }

    setStageScale(newScale);
    setStagePos({
      x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
    });
  };

  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  const deleteSelected = useCallback(() => {
    if (selectedId) {
      setItems(items.filter(i => i.id !== selectedId));
      setSelectedId(null);
      setPanels(prev => prev.map(p => ({
        ...p,
        referenceImageIds: p.referenceImageIds.filter(id => id !== selectedId)
      })));
    }
  }, [items, selectedId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        deleteSelected();
      }

      if (e.key.toLowerCase() === 'q' && (e.ctrlKey || e.metaKey) && selectedId && activePanelId) {
        e.preventDefault();
        const item = items.find(i => i.id === selectedId);
        if (item && item.type === 'image') {
          const currentPanel = panels.find(p => p.id === activePanelId);
          if (currentPanel) {
            updatePanel(activePanelId, {
              referenceImageIds: currentPanel.referenceImageIds.includes(selectedId) 
                ? currentPanel.referenceImageIds
                : [...currentPanel.referenceImageIds, selectedId]
            });
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteSelected, panels, activePanelId, items]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.clipboardData && e.clipboardData.items) {
        Array.from(e.clipboardData.items).forEach(item => {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              const url = URL.createObjectURL(file);
              const bgImg = new window.Image();
              bgImg.onload = () => {
                 const stage = stageRef.current;
                 let centerX = 500;
                 let centerY = 500;
                 if (stage) {
                    centerX = -stage.x() / stage.scaleX() + stage.width() / 2 / stage.scaleX();
                    centerY = -stage.y() / stage.scaleY() + stage.height() / 2 / stage.scaleY();
                 }

                 let w = bgImg.width;
                 let h = bgImg.height;
                 const maxSize = 512;
                 if (w > maxSize || h > maxSize) {
                   if (w > h) {
                      h = (h / w) * maxSize;
                      w = maxSize;
                   } else {
                      w = (w / h) * maxSize;
                      h = maxSize;
                   }
                 }

                 setItems(prev => [...prev, {
                    id: 'img-' + Math.random().toString(36).substring(2, 11),
                    type: 'image',
                    url,
                    prompt: 'Pasted image',
                    modelId: 'paste',
                    x: centerX - w / 2,
                    y: centerY - h / 2,
                    width: w,
                    height: h
                 }]);
              };
              bgImg.src = url;
            }
          }
        });
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!stageRef.current) return;
    stageRef.current.setPointersPositions(e);
    
    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    const x = (pos.x - stage.x()) / stage.scaleX();
    const y = (pos.y - stage.y()) / stage.scaleY();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          const bgImg = new window.Image();
          bgImg.onload = () => {
             let w = bgImg.width;
             let h = bgImg.height;
             const maxSize = 512;
             if (w > maxSize || h > maxSize) {
               if (w > h) {
                  h = (h / w) * maxSize;
                  w = maxSize;
               } else {
                  w = (w / h) * maxSize;
                  h = maxSize;
               }
             }

             setItems(prev => [...prev, {
                id: 'img-' + Math.random().toString(36).substring(2, 11),
                type: 'image',
                url,
                prompt: 'Dropped image',
                modelId: 'upload',
                x: x - w / 2 + (index * (maxSize + 20)),
                y: y - h / 2,
                width: w,
                height: h
             }]);
          };
          bgImg.src = url;
        }
      });
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const downloadImageAtUrl = async (url: string) => {
    try {
      addLog('info', '正在准备下载图片...');
      let urlToDownload = url;
      
      if (!url.startsWith('data:') && !url.startsWith('blob:')) {
        try {
          // Attempt direct fetch (works if CORS is allowed)
          const response = await fetch(url, { mode: 'cors' });
          if (!response.ok) throw new Error('Direct fetch failed');
          const blob = await response.blob();
          urlToDownload = URL.createObjectURL(blob);
        } catch (err) {
          console.warn('Direct fetch failed, trying proxy...', err);
          // Try different proxies
          const proxies = [
            (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`
          ];

          let success = false;
          for (const proxy of proxies) {
            try {
              const response = await fetch(proxy(url));
              if (response.ok) {
                const blob = await response.blob();
                urlToDownload = URL.createObjectURL(blob);
                success = true;
                break;
              }
            } catch (e) {
              console.warn('Proxy failed:', e);
            }
          }
          if (!success) throw new Error('All proxies failed');
        }
      }
      
      const link = document.createElement('a');
      link.href = urlToDownload;
      link.download = `canvas_image_${Date.now()}.png`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (urlToDownload !== url) {
        setTimeout(() => URL.revokeObjectURL(urlToDownload), 2000);
      }

      // In some environments, the programmatic click is blocked.
      // As a fallback, we open in new tab.
      if (window.top !== window.self) {
         window.open(urlToDownload, '_blank');
      }
      
      addLog('info', '下载指令已发送');
    } catch (e) {
      console.error('Download failed', e);
      addLog('error', '下载失败: ' + (e instanceof Error ? e.message : String(e)));
      alert('下载图片失败，这通常是因为跨域限制导致无法自动保存。请通过鼠标右键或长按图片选择“图片另存为”来下载。');
    }
  };

  const downloadSelected = async () => {
    const item = items.find(i => i.id === selectedId);
    if (!item || !item.url) return;
    await downloadImageAtUrl(item.url);
  };

  const getDimensions = (r: string, res: string) => {
    // Both edges must be multiples of 16
    // Max edge <= 3840, Max area <= 8,294,400
    if (res === '4K') {
      switch (r) {
        case '1:1': return '2880x2880';
        case '9:16': return '2160x3840';
        case '16:9': return '3840x2160';
        case '4:3': return '3136x2352';
        case '3:4': return '2352x3136';
        case '21:9': return '3840x1632';
        case '3:2': return '3456x2304';
        case '2:3': return '2304x3456';
        default: return '2880x2880';
      }
    } else if (res === '2K') {
      switch (r) {
        case '1:1': return '2048x2048';
        case '9:16': return '1152x2048';
        case '16:9': return '2048x1152';
        case '4:3': return '1664x1248';
        case '3:4': return '1248x1664';
        case '21:9': return '2560x1088';
        case '3:2': return '2048x1360';
        case '2:3': return '1360x2048';
        default: return '2048x2048';
      }
    } else {
      switch (r) {
        case '1:1': return '1024x1024';
        case '9:16': return '1024x1792';
        case '16:9': return '1792x1024';
        case '4:3': return '1024x768';
        case '3:4': return '768x1024';
        case '21:9': return '1792x768';
        case '3:2': return '1536x1024';
        case '2:3': return '1024x1536';
        default: return '1024x1024';
      }
    }
  };

  const processFiles = (files: FileList | null, targetPanelId?: string | null) => {
    if (!files) return;
    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const bgImg = new window.Image();
        bgImg.onload = () => {
          const stage = stageRef.current;
          let centerX = 500;
          let centerY = 500;
          if (stage) {
            centerX = -stage.x() / stage.scaleX() + stage.width() / 2 / stage.scaleX();
            centerY = -stage.y() / stage.scaleY() + stage.height() / 2 / stage.scaleY();
          }

          let w = bgImg.width;
          let h = bgImg.height;
          const maxSize = 512;
          if (w > maxSize || h > maxSize) {
            if (w > h) {
              h = (h / w) * maxSize;
              w = maxSize;
            } else {
              w = (w / h) * maxSize;
              h = maxSize;
            }
          }

          const newItemId = 'img-' + Math.random().toString(36).substring(2, 11);
          setItems(prev => [...prev, {
            id: newItemId,
            type: 'image',
            url,
            prompt: 'Uploaded image',
            modelId: 'upload',
            x: centerX - w / 2 + (index * 20),
            y: centerY - h / 2 + (index * 20),
            width: w,
            height: h
          }]);

          if (targetPanelId) {
            setPanels(prev => prev.map(p => {
              if (p.id === targetPanelId) {
                return { ...p, referenceImageIds: [...p.referenceImageIds, newItemId] };
              }
              return p;
            }));
          }
        };
        bgImg.src = url;
      }
    });
  };

  const updateLines = useCallback(() => {
    if (!svgLinesRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    panels.forEach(panel => {
      const panelDiv = document.getElementById(`panel-${panel.id}`);
      if (!panelDiv) return;
      const panelRect = panelDiv.getBoundingClientRect();
      const panelPortX = panelRect.left - containerRect.left;
      const panelPortY = panelRect.top - containerRect.top + panelRect.height / 2;

      panel.referenceImageIds.forEach(id => {
        const line = document.getElementById(`line-${panel.id}-${id}`) as any;
        if (!line) return;
        
        const item = items.find(it => it.id === id);
        if (!item) return;

        let itemX = item.x;
        let itemY = item.y;
        let width = item.width || 512;
        let height = item.height || 512;

        if (stageRef.current) {
          const node = stageRef.current.findOne(`#image-${id}`);
          if (node) {
            itemX = node.x();
            itemY = node.y();
            width = node.width() * node.scaleX();
            height = node.height() * node.scaleY();
          }
        }
        
        const screenItemX = (itemX || 0) * stageScale + stagePos.x;
        const screenItemY = (itemY || 0) * stageScale + stagePos.y;
        const portX = screenItemX + (width || 512) * stageScale;
        const portY = screenItemY + ((height || 512) + HEADER_HEIGHT) * stageScale / 2;
        
        const cp1x = portX + Math.abs(panelPortX - portX) * 0.5;
        const cp2x = panelPortX - Math.abs(panelPortX - portX) * 0.5;
        
        if (isNaN(portX) || isNaN(portY) || isNaN(panelPortX) || isNaN(panelPortY)) return;
        
        const d = `M ${portX} ${portY} C ${cp1x} ${portY}, ${cp2x} ${panelPortY}, ${panelPortX} ${panelPortY}`;
        line.setAttribute('d', d);
      });
    });
  }, [panels, items, stageScale, stagePos]);

  useEffect(() => {
    updateLines();
  }, [updateLines]);

  const blobUrlToBase64 = async (url: string): Promise<string> => {
    let targetUrl = url;
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      targetUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }
      
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_SIZE = 1024;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          reject(new Error("No canvas context"));
        }
      };
      img.onerror = () => reject(new Error("Failed to load image for resizing"));
      img.src = targetUrl;
    });
  };

  const addLog = (type: LogEntry['type'], message: string, details?: any) => {
    const newLog: LogEntry = {
      id: 'log-' + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const generateImage = async (panelId: string) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel || !panel.prompt.trim() || panel.isGenerating) return;
    
    // 解析模型配置
    const imageModels = models.filter(m => m.category === 'Image');
    const firstImageModelId = imageModels[0]?.id || (models[0]?.id || '');
    const resolvedModelId = models.find(m => m.id === panel.selectedModel) ? panel.selectedModel : firstImageModelId;
    const config = getEffectiveConfig(resolvedModelId);
    
    if (!config.apiKey) {
      addLog('error', '尝试生成失败: 接口未配置 API Key。');
      return;
    }

    updatePanel(panelId, { isGenerating: true, selectedModel: resolvedModelId });
    addLog('info', `开始生成任务: [${resolvedModelId}] ${panel.prompt.substring(0, 30)}...`);
    
    try {
      const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");
      const targetModel = config.modelId || resolvedModelId;
      const isChatModel = models.find((m) => m.id === resolvedModelId)?.category === "Chat";
      const endpoint = isChatModel ? "/v1/chat/completions" : "/v1/images/generations";

      let payload: any = { model: targetModel };

      if (isChatModel) {
        payload.messages = [{ role: "user", content: panel.prompt }];
      } else {
        payload.prompt = panel.prompt;
        payload.n = panel.count;

        if (targetModel.toLowerCase().includes("dall-e-3") || targetModel.toLowerCase().includes("dall-e-2")) {
          if (panel.ratio === "1:1") payload.size = "1024x1024";
          else if (panel.ratio.split(":")[0] > panel.ratio.split(":")[1]) payload.size = "1792x1024";
          else payload.size = "1024x1792";
          if (targetModel.toLowerCase().includes("dall-e-3")) {
            payload.quality = panel.resolution === "4K" ? "hd" : "standard";
          }
        } else {
          // Send size as string for typical models, avoid sending aspect_ratio which breaks OpenAI schema validation
          payload.size = getDimensions(panel.ratio, panel.resolution);
        }

        const referenceImages = panel.referenceImageIds
          .map((id) => items.find((i) => i.id === id))
          .filter((i) => i && i.type === "image") as CanvasItem[];

        if (referenceImages.length > 0) {
          try {
            const b64 = await blobUrlToBase64(referenceImages[0].url!);
            payload.image_url = b64;
            payload.image = b64;
          } catch (e) {
            console.error("Ref conversion failed", e);
            addLog("error", "参考图处理失败，将尝试纯文字生成。");
          }
        }
      }

      addLog("request", `发送请求至 ${baseUrl}${endpoint}`, {
        ...payload,
        image_url: payload.image_url ? "(BASE64)" : undefined,
      });

      // 使用异步代理模式，避免前端 60 秒硬超时限制
      let response;
      try {
        const startRes = await axios.post("/api/proxy/start", {
          url: `${baseUrl}${endpoint}`,
          method: 'POST',
          data: payload,
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            ...(globalConfig.group ? { "X-Group": globalConfig.group } : {}),
          }
        });
        
        const taskId = startRes.data.taskId;
        addLog("info", `任务已提交 (ID: ${taskId})，后代代理生图中...此过程不受60秒限制。`);
        
        // 开始轮询，每 3 秒检查一次
        while (true) {
          await new Promise(r => setTimeout(r, 3000));
          const statusRes = await axios.get(`/api/proxy/status/${taskId}`, {
            validateStatus: (status) => status >= 200 && status < 300 || status === 202
          });
          
          if (statusRes.status === 202) {
             // 仍在生成中
             continue;
          } else {
             // 生成完成
             response = statusRes;
             break;
          }
        }
      } catch (proxyError: any) {
        throw proxyError;
      }

      addLog("response", `收到响应 [${response.status}]`, response.data);

      if (response.data?.error) {
        throw new Error(response.data.error.message || JSON.stringify(response.data.error));
      }
      
      if (response.data?.success === false || response.data?.status === false) {
        throw new Error((response.data.message || response.data.err_msg || JSON.stringify(response.data)));
      }

      const stage = stageRef.current;
      const centerX = stage ? -stage.x() / stage.scaleX() + stage.width() / 2 / stage.scaleX() : 512;
      const centerY = stage ? -stage.y() / stage.scaleY() + stage.height() / 2 / stage.scaleY() : 512;

      let newItems: CanvasItem[] = [];

      if (isChatModel) {
        const text = response.data?.choices?.[0]?.message?.content || response.data?.content || response.data?.text || (typeof response.data === 'string' ? response.data : null);
        if (text) {
          newItems.push({
            id: `txt-${Date.now()}`,
            type: "text",
            text,
            x: centerX - 200,
            y: centerY - 100,
            width: 400,
            height: 200,
            prompt: panel.prompt,
            modelId: panel.selectedModel,
          });
        }
      } else {
        // 多样化解析逻辑：深度探测响应中的图片数据
        let rawResults: any[] = [];
        let d = response.data;
        if (typeof d === 'string') {
          try { d = JSON.parse(d); } catch(e){}
        }
        
        if (Array.isArray(d)) rawResults = d;
        else if (Array.isArray(d?.data)) rawResults = d.data;
        else if (Array.isArray(d?.images)) rawResults = d.images;
        else if (Array.isArray(d?.results)) rawResults = d.results;
        else if (d?.choices && Array.isArray(d.choices)) {
          // Some models return image URLs inside choices like text models!
          rawResults = d.choices.map((c: any) => c.message?.content || c.text || c).filter(Boolean);
        }
        else if (d?.url || d?.b64_json || d?.image) rawResults = [d]; // 单个对象情况
        else if (d?.data?.url || d?.data?.b64_json || d?.data?.image) rawResults = [d.data];
        else if (typeof d?.data === 'string') rawResults = [d.data];
        else if (typeof d === 'string' && (d.startsWith('http') || d.startsWith('data:'))) rawResults = [d];
        else {
           // Recursive search for 'url' or 'url' patterns in string
           const findUrlsDeep = (obj: any): string[] => {
              let found: string[] = [];
              if (!obj) return found;
              if (typeof obj === 'string') {
                 if (obj.startsWith('http')) return [obj];
                 const mdMatch = obj.match(/!\[.*?\]\((https?:\/\/.*?)\)/g);
                 if (mdMatch) {
                    return mdMatch.map(m => m.match(/\((.*?)\)/)?.[1] || '');
                 }
                 return found;
              }
              if (typeof obj !== 'object') return found;
              
              if (obj.url && typeof obj.url === 'string') found.push(obj.url);
              if (obj.b64_json && typeof obj.b64_json === 'string') found.push(obj.b64_json);
              
              for (const key in obj) {
                 if (typeof obj[key] === 'object' || typeof obj[key] === 'string') {
                    found = found.concat(findUrlsDeep(obj[key]));
                 }
              }
              return found;
           };
           const deepUrls = findUrlsDeep(d);
           if (deepUrls.length > 0) {
              rawResults = deepUrls;
           }
        }
        
        rawResults = rawResults.filter(Boolean);
        
        rawResults.forEach((res: any, idx: number) => {
          let url = null;
          if (typeof res === "string") {
            // Assume the string might be a URL or b64 or markdown image
            const mdImageMatch = res.match(/!\[.*?\]\((.*?)\)/);
            if (mdImageMatch) {
              url = mdImageMatch[1];
            } else {
              url = res;
            }
          } else if (res) {
            url = res.url || res.b64_json || res.image || res.image_url;
          }
          
          if (url && typeof url === 'string') {
            if (!url.startsWith('http') && !url.startsWith('data:')) {
               // 自动补全 base64 头
               url = `data:image/png;base64,${url}`;
            }
            newItems.push({
              id: `img-${Date.now()}-${idx}`,
              type: "image",
              url,
              x: centerX - 256 + idx * 40,
              y: centerY - 256 + idx * 40,
              width: 512,
              height: 512,
              prompt: panel.prompt,
              modelId: panel.selectedModel,
            });
          }
        });
      }

      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems]);
        setHistory((prev) =>
          [
            {
              id: Date.now().toString(),
              timestamp: new Date().toLocaleTimeString(),
              prompt: panel.prompt,
              modelId: panel.selectedModel,
              items: newItems,
            },
            ...prev,
          ].slice(0, 50)
        );
        addLog("info", `成功获取 ${newItems.length} 个结果`);
        updatePanel(panelId, { prompt: "" });
        if (onTaskComplete) onTaskComplete();
      } else {
        addLog("error", "API响应包含未知格式", response.data);
        let preview = typeof response.data === 'string' ? response.data.substring(0, 1000) : JSON.stringify(response.data).substring(0, 1000);
        if (typeof response.data === 'string' && response.data.toLowerCase().includes('<!doctype html>')) {
           throw new Error(`由于请求超过了环境的60秒超时限制，连接已被强制中断。
后台 (linyi01ai.com) 可能仍在继续生成（例如 gpt-image-2 通常耗时 200多秒），并会在完成后显示在您的控制台。
但是前端无法保持 60 秒以上的等待。建议您换用较快的模型，或前往接口后台查看由于超时未能返回的图片。`);
        }
        throw new Error(`响应中未包含有效模型结果。内容: ${preview}`);
      }
    } catch (e: any) {
      console.warn("Generation failed:", e); // Use warn instead of error to avoid Vite floating overlay stealing focus
      let errorMsg = "未知错误";
      let details = null;

      if (e.code === "ECONNABORTED") {
        errorMsg = "请求超时。服务器响应过慢，请稍后重试。";
      } else if (e.message === "Network Error") {
        errorMsg = "网络连接错误 (Network Error)。这通常是因为：\n1. 接口地址填写错误或无法访问\n2. 浏览器拦截了跨域请求 (CORS)\n3. 您的 API 接口不支持当前域名访问";
      } else if (e.response) {
        details = e.response.data;
        const serverError = details?.error?.message || details?.message || details?.error;
        errorMsg = serverError ? `代理错误: ${serverError}` : `服务器返回错误 [${e.response.status}]`;
        if (e.response.status === 413) {
          errorMsg = "请求数据量过大 (413 Payload Too Large)。请尝试减少生成数量或不使用过大的参考图。";
        } else if (e.response.status === 504) {
          errorMsg = "网关超时 (504 Gateway Timeout)。该模型生图时间过长，导致网络连接中断。API后台可能仍在继续生成（如您的截图所示255秒）。前往您的 API 接口控制台可查看结果。建议换用速度更快的模型进行前端测试。";
        } else if (e.response.status === 502) {
          errorMsg = "网关错误 (502 Bad Gateway)。API 服务器无响应或生图时间过长导致断开网络。API后台可能仍在继续生成，您可前往 API 接口控制台查看结果。";
        }
      } else {
        errorMsg = e.message || String(e);
      }

      addLog("error", `生成失败: ${errorMsg}`, details);
    } finally {
      updatePanel(panelId, { isGenerating: false });
    }
  };





  const handleStageMouseMove = (e: any) => {
    if (activeConnectingId && stageRef.current) {
      const pos = stageRef.current.getPointerPosition();
      if (pos) {
        setDragMousePos(pos);
      }
    }
  };

  const handleStageMouseUp = () => {
    if (activeConnectingId && stageRef.current) {
      const pos = stageRef.current.getPointerPosition();
      if (!pos) {
        setActiveConnectingId(null);
        return;
      }

      panels.forEach(panel => {
        const panelDiv = document.getElementById(`panel-${panel.id}`);
        if (panelDiv && containerRef.current) {
          const panelRect = panelDiv.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          const portX = panelRect.left - containerRect.left;
          const portY = panelRect.top - containerRect.top + panelRect.height / 2;
          
          const dist = Math.sqrt(Math.pow(pos.x - portX, 2) + Math.pow(pos.y - portY, 2));
          if (dist < 60) {
            if (!panel.referenceImageIds.includes(activeConnectingId)) {
              updatePanel(panel.id, {
                referenceImageIds: [...panel.referenceImageIds, activeConnectingId]
              });
            }
          }
        }
      });
      setActiveConnectingId(null);
    }
  };

  const handleStartConnection = (id: string, startPos: { x: number, y: number }) => {
    setActiveConnectingId(id);
    setDragMousePos(startPos);
  };

  return (
    <div 
      className="relative w-full h-full bg-zinc-950 overflow-hidden touch-none" 
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <g ref={svgLinesRef} className="hidden">
          {panels.flatMap(panel => panel.referenceImageIds.map(id => ({ panelId: panel.id, itemId: id }))).map(({ panelId, itemId }) => (
            <path
              key={`line-${panelId}-${itemId}`}
              id={`line-${panelId}-${itemId}`}
              stroke="#3b82f6"
              strokeWidth="2.5"
              fill="none"
              filter="url(#glow)"
              className="transition-all duration-300"
            />
          ))}
          {activeConnectingId && (
             <path
               d={(() => {
                 const id = activeConnectingId;
                 const item = items.find(it => it.id === id);
                 if (!item) return "";
                 const node = stageRef.current?.findOne(`#image-${id}`);
                 
                 // Fallback values if node or item coordinates are missing
                 const itemX = node ? node.x() : (item.x || 0);
                 const itemY = node ? node.y() : (item.y || 0);
                 const width = node ? (node.width() * node.scaleX()) : (item.width || 512);
                 const height = node ? (node.height() * node.scaleY()) : (item.height || 512);
                 
                 const screenItemX = (itemX || 0) * stageScale + stagePos.x;
                 const screenItemY = (itemY || 0) * stageScale + stagePos.y;
                 const portX = screenItemX + (width || 0) * stageScale;
                 const portY = screenItemY + ((height || 0) + HEADER_HEIGHT) * stageScale / 2;
                 
                 const mouseX = dragMousePos?.x || 0;
                 const mouseY = dragMousePos?.y || 0;

                 if (isNaN(portX) || isNaN(portY) || isNaN(mouseX) || isNaN(mouseY)) return "";
                 
                 const cp1x = portX + Math.abs(mouseX - portX) * 0.5;
                 const cp2x = mouseX - Math.abs(mouseX - portX) * 0.5;
                 return `M ${portX} ${portY} C ${cp1x} ${portY}, ${cp2x} ${mouseY}, ${mouseX} ${mouseY}`;
               })()}
               stroke="#3b82f6"
               strokeWidth="2"
               strokeDasharray="4 4"
               fill="none"
               opacity="0.6"
             />
          )}
        </g>
      </svg>

      {/* Global Shortcut Hint */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-1.5 backdrop-blur-md shadow-lg flex items-center gap-4">
           <div className="flex items-center gap-2">
            <kbd className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-700 shadow-sm">Ctrl + Q</kbd>
            <span className="text-[10px] text-zinc-400 font-medium">添加选中图到参考</span>
          </div>
          <div className="w-[1px] h-3 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <kbd className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-700 shadow-sm">Ctrl + Click</kbd>
            <span className="text-[10px] text-zinc-400 font-medium">多选节点</span>
          </div>
        </div>
      </div>

      {/* Hidden File Input for Direct uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        multiple
        onChange={(e) => {
          processFiles(e.target.files, uploadTargetPanelId);
          setUploadTargetPanelId(null);
          if (e.target) e.target.value = '';
        }}
      />

      <div 
        className="absolute inset-0 z-0 pointer-events-none transition-all duration-75"
        style={{
          backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)',
          backgroundSize: `${20 * stageScale}px ${20 * stageScale}px`,
          backgroundPosition: `${stagePos.x}px ${stagePos.y}px`,
          opacity: 0.5
        }}
      />
      
      <div className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing">
        <Stage
          width={size.width}
          height={size.height}
          onWheel={handleWheel}
          onMouseDown={checkDeselect}
          onTouchStart={checkDeselect}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onTouchMove={handleStageMouseMove}
          onTouchEnd={handleStageMouseUp}
          onDblClick={(e) => {
            if (e.target === e.target.getStage()) {
               handleStageDblClick(e);
            }
          }}
          onDblTap={(e) => {
            if (e.target === e.target.getStage()) {
               handleStageDblClick(e);
            }
          }}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable
          onDragMove={(e) => {
            if (e.target === e.target.getStage()) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
              updateLines();
            }
          }}
          ref={stageRef}
        >
          <Layer>
            {items.map((item) => (
              <URLImage
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                onSelect={() => setSelectedId(item.id)}
                onDragMove={updateLines}
                onStartConnection={handleStartConnection}
                onDoubleClick={() => setEnlargedImageId(item.id)}
                onChange={(newAttrs) => {
                  setItems(prev => prev.map(x => x.id === item.id ? newAttrs : x));
                }}
              />
            ))}
          </Layer>
          <Layer>
            {panels.map(panel => (
              <Group
                key={panel.id}
                x={panel.x}
                y={panel.y}
                draggable
                onDragMove={(e) => {
                  if (e.target.getClassName() === 'Group') {
                    updatePanel(panel.id, { x: e.target.x(), y: e.target.y() });
                    updateLines();
                  }
                }}
                onPointerDown={() => setActivePanelId(panel.id)}
              >
                {/* Visual handle / Hit area - covers most of the panel to allow dragging from non-interactive areas */}
                <Rect 
                  width={320} 
                  height={580} 
                  fill="#ffffff" 
                  opacity={0}
                  onMouseEnter={(e: any) => {
                    const container = e.target.getStage().container();
                    container.style.cursor = 'grab';
                  }}
                  onMouseLeave={(e: any) => {
                    const container = e.target.getStage().container();
                    container.style.cursor = 'default';
                  }}
                  onMouseDown={(e: any) => {
                    const container = e.target.getStage().container();
                    container.style.cursor = 'grabbing';
                  }}
                  onMouseUp={(e: any) => {
                    const container = e.target.getStage().container();
                    container.style.cursor = 'grab';
                  }}
                />
                
                {/* The panel itself */}
                <Html transform={true} divProps={{ style: { pointerEvents: 'none' } }}>
                  <div 
                    id={`panel-${panel.id}`}
                    className={`w-80 bg-zinc-900/90 backdrop-blur-xl border rounded-2xl shadow-2xl flex flex-col p-5 transition-colors pointer-events-none ${
                      activePanelId === panel.id ? 'border-blue-500/50' : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4 pointer-events-none">
                      <h2 
                        className="text-zinc-200 font-bold flex items-center gap-2"
                      >
                        <Sparkles size={18} className={activePanelId === panel.id ? "text-blue-400" : "text-zinc-500"} />
                        生成模板 ({panel.id.slice(-4)})
                      </h2>
                      <div className="flex items-center gap-1 pointer-events-auto">
                        {panel.referenceImageIds.length > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-400 font-bold">
                            <ImageIcon size={10} /> {panel.referenceImageIds.length}
                          </div>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); removePanel(panel.id); }} className="p-1 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 rounded-md transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-zinc-900 bg-blue-500" />
                    
                    <div className="space-y-4 pointer-events-auto">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">选择模型</label>
                        <select value={panel.selectedModel} onChange={(e) => updatePanel(panel.id, { selectedModel: e.target.value })} className="w-full bg-[#1e1e1e] border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none">
                          {models.filter(m => m.category === 'Image').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">质量预设 (最高)</label>
                          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60 shadow-inner">
                            {['1K', '2K', '4K'].map(res => (
                              <button 
                                key={res} 
                                onClick={() => updatePanel(panel.id, { resolution: res })}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${panel.resolution === res ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                              >
                                {res}
                              </button>
                            ))}
                          </div>
                          {panel.resolution !== '1K' && (
                            <div className="text-[9px] text-amber-500/80 leading-tight mt-1">
                              注意: 高分辨率生图耗时极长，可能导致第三方接口因超时断开引发504报错。如无法返回请换回 1K。
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">生成数量</label>
                          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60 shadow-inner">
                            {[1, 2, 3, 4].map(n => (
                              <button 
                                key={n} 
                                onClick={() => updatePanel(panel.id, { count: n })}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${panel.count === n ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                         <div className="flex items-center justify-between">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <ImageIcon size={12} className="text-blue-500" /> 参考图连接
                          </label>
                          <span className="text-[9px] text-zinc-600">点击此处上传 / 拖拽连线</span>
                         </div>
                         
                         <div 
                           onClick={() => {
                             setUploadTargetPanelId(panel.id);
                             fileInputRef.current?.click();
                           }}
                           className="min-h-[60px] bg-black/40 rounded-xl border border-zinc-800/80 p-2 flex flex-wrap gap-2 hover:bg-black/60 hover:border-blue-500/30 cursor-pointer transition-all active:scale-[0.98]"
                         >
                           {panel.referenceImageIds.length === 0 ? (
                             <div className="w-full flex items-center justify-center text-zinc-700 text-[10px] gap-2 py-3">
                               <LinkIcon size={12} />
                               <span>无连入参考图</span>
                             </div>
                           ) : (
                             panel.referenceImageIds.map(id => {
                               const item = items.find(it => it.id === id);
                               if (!item) return null;
                               return (
                                 <div 
                                   key={id} 
                                   draggable
                                   onDragStart={(e) => {
                                     e.stopPropagation();
                                     setDraggedRefItemId(id);
                                   }}
                                   onDragOver={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     if (draggedRefItemId && draggedRefItemId !== id) {
                                       setDragOverRefItemId(id);
                                     }
                                   }}
                                   onDragLeave={() => setDragOverRefItemId(null)}
                                   onDrop={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     if (draggedRefItemId && draggedRefItemId !== id) {
                                       const newIds = [...panel.referenceImageIds];
                                       const draggedIndex = newIds.indexOf(draggedRefItemId);
                                       const targetIndex = newIds.indexOf(id);
                                       
                                       if (draggedIndex !== -1 && targetIndex !== -1) {
                                         newIds.splice(draggedIndex, 1);
                                         newIds.splice(targetIndex, 0, draggedRefItemId);
                                         updatePanel(panel.id, { referenceImageIds: newIds });
                                       }
                                     }
                                     setDraggedRefItemId(null);
                                     setDragOverRefItemId(null);
                                   }}
                                   onDragEnd={() => {
                                     setDraggedRefItemId(null);
                                     setDragOverRefItemId(null);
                                   }}
                                   className={`group relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 cursor-move ${
                                     dragOverRefItemId === id ? 'border-yellow-500 scale-110 z-10 shadow-lg' : 'border-zinc-800 hover:border-blue-500/50'
                                   }`} 
                                   onClick={(e) => { e.stopPropagation(); setEnlargedImageId(item.id); }}
                                 >
                                   <img src={item.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); updatePanel(panel.id, { referenceImageIds: panel.referenceImageIds.filter(i => i !== id) }); }}
                                     className="absolute top-0 right-0 w-4 h-4 rounded-bl-lg bg-red-500/80 hover:bg-red-500 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                   >
                                     <X size={10} />
                                   </button>
                                 </div>
                               );
                             })
                           )}
                         </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">画布比例 & 目标分辨率</label>
                        </div>
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/20 border border-zinc-800/60">
                          {['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3'].map(r => {
                            const dims = getDimensions(r, panel.resolution);
                            return (
                              <button 
                                key={r} 
                                onClick={() => updatePanel(panel.id, { ratio: r })} 
                                className={`px-2 py-2 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${panel.ratio === r ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                              >
                                <span>{r}</span>
                                <span className="text-[9px] font-mono tracking-tighter bg-black/20 px-1 rounded">{dims}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">提示词</label>
                        <PanelTextarea panel={panel} updatePanel={updatePanel} />
                      </div>

                      <button
                        onClick={() => generateImage(panel.id)}
                        disabled={!panel.prompt.trim() || panel.isGenerating}
                        className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        {panel.isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                        <span>{panel.isGenerating ? "生成中..." : "立即生成"}</span>
                      </button>
                    </div>
                  </div>
                </Html>
              </Group>
            ))}
          </Layer>
        </Stage>
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-1/2 z-20 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl shadow-2xl flex gap-2 items-center -translate-x-1/2"
          >
            <button onClick={downloadSelected} className="px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl flex items-center gap-2 text-sm transition-colors">
              <Download size={16} /> 下载
            </button>
            <button onClick={deleteSelected} className="px-3 py-2 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl flex items-center gap-2 text-sm transition-colors">
              <Trash2 size={16} /> 删除
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
        <button onClick={() => addPanelAt()} className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg transition-all font-bold text-lg active:scale-95">+</button>
      </div>

      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
        <button onClick={() => setStageScale(prev => prev * 1.2)} className="w-10 h-10 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white shadow-lg"><ZoomIn size={18} /></button>
        <button onClick={() => setStageScale(prev => prev / 1.2)} className="w-10 h-10 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white shadow-lg"><ZoomOut size={18} /></button>
        <button onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }} className="w-10 h-10 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white shadow-lg transition-transform active:rotate-180"><RefreshCw size={18} /></button>
      </div>

      <AnimatePresence>
        {enlargedImageId && (
           <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-10 overflow-hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEnlargedImageId(null);
                setImgNaturalSize(null);
                setEnlargedScale(1);
                setEnlargedPos({ x: 0, y: 0 });
              }
            }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY;
              const scaleBy = 1.1;
              setEnlargedScale(prev => {
                const next = delta < 0 ? prev * scaleBy : prev / scaleBy;
                return Math.min(Math.max(next, 0.8), 10);
              });
            }}
            onMouseDown={() => setIsDraggingEnlarged(true)}
            onMouseUp={() => setIsDraggingEnlarged(false)}
            onMouseMove={(e) => {
              if (isDraggingEnlarged) {
                setEnlargedPos(prev => ({
                  x: prev.x + e.movementX,
                  y: prev.y + e.movementY
                }));
              }
            }}
          >
            <div className="relative group flex items-center justify-center w-full h-full">
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ 
                  scale: enlargedScale, 
                  x: enlargedPos.x,
                  y: enlargedPos.y,
                  opacity: 1 
                }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.5 }}
                src={items.find(i => i.id === enlargedImageId)?.url}
                className={`max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl border border-zinc-800 pointer-events-none select-none ${enlargedScale > 1 ? 'cursor-grab' : ''}`}
                style={{ cursor: enlargedScale > 1 ? (isDraggingEnlarged ? 'grabbing' : 'grab') : 'default' }}
                referrerPolicy="no-referrer"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                }}
              />
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none">
                {imgNaturalSize && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white text-xs font-medium flex items-center gap-3 shadow-2xl"
                  >
                    <div className="flex items-center gap-1.5 px-2 py-0.5 border-r border-white/20 last:border-0 text-blue-400">
                      <Search size={14} />
                      <span>{Math.round(enlargedScale * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 border-r border-white/20 last:border-0">
                      <span className="text-zinc-400">分辨率:</span>
                      <span className="font-mono">{imgNaturalSize.w} × {imgNaturalSize.h}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 border-r border-white/20 last:border-0">
                      <span className="text-zinc-400">比例:</span>
                      <span className="bg-blue-500/20 text-blue-400 px-1.5 rounded font-bold">{getAspectRatioStr(imgNaturalSize.w, imgNaturalSize.h)}</span>
                    </div>
                  </motion.div>
                )}
                <div className="text-[10px] text-zinc-500 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-auto">
                  滚轮缩放 • 按住拖拽 • 点击背景关闭
                </div>
              </div>
            </div>

            {items.find(i => i.id === enlargedImageId)?.prompt && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-zinc-900/95 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-zinc-800 pointer-events-auto z-50">
                 <div className="flex justify-between items-center mb-3">
                   <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">提示词 (Prompt)</div>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       navigator.clipboard.writeText(items.find(i => i.id === enlargedImageId)?.prompt || "");
                     }}
                     className="text-xs text-white px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition flex items-center gap-1.5 border border-zinc-700"
                   >
                     复制文本
                   </button>
                 </div>
                 <div 
                   className="text-sm text-zinc-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar select-all"
                   onWheel={(e) => e.stopPropagation()}
                 >
                   {items.find(i => i.id === enlargedImageId)?.prompt}
                 </div>
              </div>
            )}

             <div className="absolute top-6 right-6 flex gap-3 z-50 pointer-events-auto">
               <button 
                 className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm gap-2 text-sm font-medium"
                 onClick={(e) => {
                   e.stopPropagation();
                   const item = items.find(i => i.id === enlargedImageId);
                   if (item && item.url) downloadImageAtUrl(item.url);
                 }}
               >
                 <Download size={16} /> 下载
               </button>
               <button 
                 className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                 onClick={(e) => {
                   e.stopPropagation();
                   setEnlargedImageId(null);
                   setImgNaturalSize(null);
                   setEnlargedScale(1);
                   setEnlargedPos({ x: 0, y: 0 });
                 }}
               >
                 <X size={20} />
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showGlobalHistory && (
          <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }} className="absolute top-0 right-0 w-80 h-full bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 z-[70] shadow-2xl flex flex-col">
            <div className="p-4 border-b border-zinc-800 font-bold text-sm flex items-center gap-2"><History size={18} className="text-blue-500" /> 生成历史</div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {history.map(entry => (
                <div key={entry.id} className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-[10px] text-zinc-500"><span>{entry.timestamp}</span><span>{entry.modelId}</span></div>
                  <p className="text-[11px] text-zinc-300 italic mb-2 line-clamp-2">"{entry.prompt}"</p>
                  <div className="grid grid-cols-2 gap-2">
                     {entry.items.map((item, idx) => (
                       <div key={idx} className="aspect-square bg-black rounded-lg overflow-hidden border border-zinc-800 cursor-pointer" onClick={() => {
                          const stage = stageRef.current;
                          let centerX = size.width / 2;
                          let centerY = size.height / 2;
                          if (stage) {
                             centerX = -stage.x() / stage.scaleX() + stage.width() / 2 / stage.scaleX();
                             centerY = -stage.y() / stage.scaleY() + stage.height() / 2 / stage.scaleY();
                          }
                          setItems(prev => [...prev, { ...item, id: Date.now().toString() + idx, x: centerX - 256, y: centerY - 256 }]);
                       }}><img src={item.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /></div>
                     ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGlobalLogs && (
          <motion.div initial={{ y: 240 }} animate={{ y: 0 }} exit={{ y: 240 }} className="absolute bottom-0 left-0 right-0 h-60 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 z-[80] shadow-2xl flex flex-col">
            <div className="px-4 h-10 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
               <div className="flex items-center gap-2"><Terminal size={14} className="text-green-500" /><span className="font-bold text-[10px] uppercase tracking-widest text-zinc-400">运行日志</span></div>
               <button onClick={onCloseLogs} className="p-1 hover:bg-zinc-800 rounded"><X size={16} className="text-zinc-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1 custom-scrollbar">
              {logs.map(log => (
                <div key={log.id} className="flex flex-col gap-1 border-b border-zinc-800/50 pb-2 mb-2 last:border-0 hover:bg-zinc-800/20 p-1 rounded">
                  <div className="flex gap-2">
                    <span className="text-zinc-500 whitespace-nowrap">[{log.timestamp}]</span>
                    <span className={`font-bold ${log.type === 'error' ? 'text-red-500' : log.type === 'request' ? 'text-blue-400' : log.type === 'response' ? 'text-green-400' : 'text-zinc-400'}`}>{log.type.toUpperCase()}:</span>
                    <span className="text-zinc-300 break-all">{log.message}</span>
                  </div>
                  {log.details && (
                    <div className="pl-20 text-[9px] text-zinc-500 overflow-x-auto whitespace-pre-wrap break-all custom-scrollbar bg-zinc-950/50 p-2 rounded max-h-32">
                      {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
