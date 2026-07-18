import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
}

export default function ImageAttach({ files, onChange, max = 4 }: Props) {
  const t = useT();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 拖拽调序：图片顺序 = 角色优先级（第 1 张为底图，其余为参考图）
  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const arr = [...files];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    onChange(arr);
  }

  function add(incoming: File[]) {
    const imgs = incoming.filter((f) => f.type.startsWith('image/'));
    if (imgs.length) onChange([...files, ...imgs].slice(0, max));
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const imgs = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (imgs.length) {
        e.preventDefault();
        add(imgs);
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(Array.from(e.dataTransfer.files));
        }}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-dashed p-3.5 transition ${
          dragging ? 'border-iris/60 bg-iris/10' : 'border-line bg-panel/40 hover:border-[#3a3a44]'
        }`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-panel2 text-mut2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
            <path d="M2.5 11 L6 7.5 L9 10.5 L11 8.5 L13.5 11" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-fg2">{t('attach.hint')}</div>
          <div className="mt-0.5 text-[11px] text-mut2">{t('attach.limit', { n: max })}</div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />

      {files.length > 0 && (
        <>
          {files.length > 1 && <div className="mt-2 text-[11px] text-mut2">{t('attach.reorder')}</div>}
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <Thumb
                key={i}
                file={f}
                index={i}
                showIndex={files.length > 1}
                over={overIdx === i}
                onRemove={() => onChange(files.filter((_, j) => j !== i))}
                onMoveLeft={i > 0 ? () => move(i, i - 1) : undefined}
                onDragStart={() => (dragIdx.current = i)}
                onDragOver={() => setOverIdx(i)}
                onDrop={() => {
                  if (dragIdx.current !== null) move(dragIdx.current, i);
                  dragIdx.current = null;
                  setOverIdx(null);
                }}
                onDragEnd={() => {
                  dragIdx.current = null;
                  setOverIdx(null);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Thumb({
  file,
  index,
  showIndex,
  over,
  onRemove,
  onMoveLeft,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  file: File;
  index: number;
  showIndex: boolean;
  over: boolean;
  onRemove: () => void;
  onMoveLeft?: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      className={`group relative h-16 w-16 cursor-grab overflow-hidden rounded-[10px] border transition active:cursor-grabbing ${
        over ? 'border-iris ring-2 ring-iris/50' : 'border-line'
      }`}
    >
      {url && <img src={url} alt="" draggable={false} className="h-full w-full object-cover" />}
      {showIndex && (
        <span className="absolute bottom-1 left-1 grid h-4 min-w-4 place-items-center rounded bg-black/70 px-1 text-[10px] font-medium text-white">
          {index + 1}
        </span>
      )}
      {/* 移动端：左移按钮（拖拽在触屏不稳，留个兜底） */}
      {onMoveLeft && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveLeft();
          }}
          className="absolute bottom-1 right-1 grid h-4 w-4 place-items-center rounded bg-black/70 text-[11px] text-white sm:hidden"
          aria-label="左移"
        >
          ‹
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        aria-label="移除"
      >
        ×
      </button>
    </div>
  );
}
