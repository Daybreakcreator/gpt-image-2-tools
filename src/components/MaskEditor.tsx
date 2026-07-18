import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { IconBrush, IconEraser } from './icons';

interface Props {
  file: File;
  onApply: (mask: File) => void;
  onCancel: () => void;
}

// 涂掉要改的地方，导出符合 OpenAI 规范的蒙版（涂抹处透明=待编辑）。
export default function MaskEditor({ file, onApply, onCancel }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const undo = useRef<ImageData[]>([]);
  const redo = useRef<ImageData[]>([]);
  const drawing = useRef(false);

  const [url, setUrl] = useState('');
  const [brush, setBrush] = useState(48);
  const [mode, setMode] = useState<'brush' | 'eraser'>('brush');
  const [painted, setPainted] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
    };
    img.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ctx = () => canvasRef.current!.getContext('2d')!;
  const snapshot = () => ctx().getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  const restore = (img: ImageData) => ctx().putImageData(img, 0, 0);
  function pushHistory() {
    undo.current.push(snapshot());
    redo.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }
  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }
  function paint(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const g = ctx();
    const { x, y } = pos(e);
    g.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
    g.fillStyle = 'rgba(167,139,250,1)';
    g.beginPath();
    g.arc(x, y, (brush / 2) * (c.width / c.getBoundingClientRect().width), 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  function doUndo() {
    if (!undo.current.length) return;
    redo.current.push(snapshot());
    restore(undo.current.pop()!);
    setCanUndo(undo.current.length > 0);
    setCanRedo(true);
    setPainted(undo.current.length > 0);
  }
  function doRedo() {
    if (!redo.current.length) return;
    undo.current.push(snapshot());
    restore(redo.current.pop()!);
    setCanUndo(true);
    setCanRedo(redo.current.length > 0);
    setPainted(true);
  }
  function clearAll() {
    pushHistory();
    const c = canvasRef.current!;
    ctx().clearRect(0, 0, c.width, c.height);
    setPainted(false);
  }
  function apply() {
    const c = canvasRef.current!;
    const exp = document.createElement('canvas');
    exp.width = c.width;
    exp.height = c.height;
    const ex = exp.getContext('2d')!;
    ex.fillStyle = '#000';
    ex.fillRect(0, 0, exp.width, exp.height);
    ex.globalCompositeOperation = 'destination-out';
    ex.drawImage(c, 0, 0);
    exp.toBlob((b) => b && onApply(new File([b], 'mask.png', { type: 'image/png' })), 'image/png');
  }

  const tool = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs transition ${active ? 'bg-iris text-ink font-medium' : 'border border-line text-fg2 hover:border-[#3a3a44]'}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 p-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fg"><IconBrush className="h-4 w-4" /> {t('mask.title')}</span>
          <button onClick={onCancel} className="text-sm text-fg2 hover:text-fg">{t('mask.cancel')}</button>
        </div>
        <p className="text-xs text-mut">{t('mask.tip')}</p>

        <div className="relative flex-1 select-none overflow-auto rounded-xl border border-line">
          <div className="relative inline-block">
            {url && <img src={url} alt="" className="block max-h-[56vh] w-auto" draggable={false} />}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full cursor-crosshair touch-none opacity-50"
              onPointerDown={(e) => {
                drawing.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                pushHistory();
                paint(e);
              }}
              onPointerMove={(e) => drawing.current && paint(e)}
              onPointerUp={() => {
                drawing.current = false;
                setPainted(true);
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setMode('brush')} className={tool(mode === 'brush')}><span className="inline-flex items-center gap-1.5"><IconBrush className="h-3.5 w-3.5" /> {t('mask.brush')}</span></button>
          <button onClick={() => setMode('eraser')} className={tool(mode === 'eraser')}><span className="inline-flex items-center gap-1.5"><IconEraser className="h-3.5 w-3.5" /> {t('mask.eraser')}</span></button>
          <button onClick={doUndo} disabled={!canUndo} className={`${tool(false)} disabled:opacity-30`}>{t('mask.undo')}</button>
          <button onClick={doRedo} disabled={!canRedo} className={`${tool(false)} disabled:opacity-30`}>{t('mask.redo')}</button>
          <label className="ml-1 flex items-center gap-2 text-xs text-fg2">
            {t('mask.brushSize')}
            <input type="range" min={12} max={120} value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="accent-iris" />
            <span className="w-6 text-mut">{brush}</span>
          </label>
          <button onClick={clearAll} className="text-xs text-mut hover:text-red-400">{t('mask.clear')}</button>
          <div className="flex-1" />
          <button
            onClick={apply}
            disabled={!painted}
            className="rounded-lg bg-iris px-4 py-2 text-sm font-medium text-ink transition active:scale-95 disabled:opacity-40"
          >
            {t('mask.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
