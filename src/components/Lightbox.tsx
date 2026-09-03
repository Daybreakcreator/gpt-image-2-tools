import { useEffect, useRef, useState } from 'react';
import type { ResultImage } from '@/lib/openai';
import { useT } from '@/lib/i18n';

interface Props {
  images: ResultImage[];
  index: number;
  source?: string | null; // 改图时的原图（用于前后对比）
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onContinue: (img: ResultImage) => void;
}

export default function Lightbox({ images, index, source, onIndexChange, onClose, onContinue }: Props) {
  const t = useT();
  const [compare, setCompare] = useState(false);
  const img = images[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length);
      else if (e.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length]);

  if (!img) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur" onClick={onClose}>
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs text-mut">
          {index + 1} / {images.length}
        </div>
        <div className="flex items-center gap-2">
          {source && (
            <button
              onClick={() => setCompare((v) => !v)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${compare ? 'bg-iris text-white font-medium' : 'border border-line text-fg2 hover:border-mut2'}`}
            >
              {t('lb.compare')}
            </button>
          )}
          <a
            href={img.src}
            download={`gpt-image-2-${index + 1}.${img.format}`}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-fg2 transition hover:border-[#3a3a44]"
          >
            ↓ {t('btn.download')}
          </a>
          <button
            onClick={() => onContinue(img)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink"
            style={{ background: '#a78bfa', boxShadow: '0 4px 16px rgba(167,139,250,.4)' }}
          >
            ⟳ {t('btn.continue')}
          </button>
          <button onClick={onClose} className="ml-1 rounded-lg px-3 py-1.5 text-xs text-fg2 hover:text-fg">{t('lb.close')}</button>
        </div>
      </div>

      {/* image area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-6" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
            className="absolute left-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-panel/80 text-fg2 backdrop-blur transition hover:text-fg"
            aria-label="上一张"
          >
            ‹
          </button>
        )}

        {compare && source ? (
          <Compare before={source} after={img.src} />
        ) : (
          <ZoomImage key={img.src} src={img.src} />
        )}

        {images.length > 1 && (
          <button
            onClick={() => onIndexChange((index + 1) % images.length)}
            className="absolute right-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-panel/80 text-fg2 backdrop-blur transition hover:text-fg"
            aria-label="下一张"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

// 可缩放查看：滚轮缩放 / 点击放大切换 / 拖拽平移 / 双击复位。触屏点按即放大。
function ZoomImage({ src }: { src: string }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const moved = useRef(false);

  const apply = (s: number) => {
    const ns = Math.min(5, Math.max(1, s));
    setScale(ns);
    if (ns === 1) setPan({ x: 0, y: 0 });
  };

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onWheel={(e) => {
        e.preventDefault();
        apply(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      }}
      onPointerDown={(e) => {
        if (scale === 1) return;
        drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
        moved.current = false;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        moved.current = true;
        setPan({ x: drag.current.px + (e.clientX - drag.current.sx), y: drag.current.py + (e.clientY - drag.current.sy) });
      }}
      onPointerUp={() => (drag.current = null)}
      onClick={(e) => {
        e.stopPropagation();
        if (moved.current) return; // 拖拽结束的抬手不触发缩放
        apply(scale > 1 ? 1 : 2.5);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        apply(1);
      }}
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        cursor: scale > 1 ? (drag.current ? 'grabbing' : 'grab') : 'zoom-in',
        transition: drag.current ? 'none' : 'transform .15s',
        touchAction: 'none',
      }}
      className="max-h-full max-w-full select-none rounded-xl object-contain"
    />
  );
}

function Compare({ before, after }: { before: string; after: string }) {
  const t = useT();
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function move(clientX: number) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  }

  return (
    <div
      ref={ref}
      className="relative inline-block touch-none select-none"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
    >
      <img src={after} alt="" className="block max-h-[78vh] w-auto rounded-xl" draggable={false} />
      <img
        src={before}
        alt=""
        className="absolute inset-0 h-full w-full rounded-xl object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      {/* labels */}
      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{t('lb.before')}</span>
      <span className="absolute right-2 top-2 rounded bg-iris/80 px-1.5 py-0.5 text-[10px] text-white">{t('lb.after')}</span>
      {/* handle */}
      <div className="absolute bottom-0 top-0 w-px bg-white/80" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-black/60 text-xs text-white">⇄</span>
      </div>
    </div>
  );
}
