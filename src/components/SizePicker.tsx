import { useEffect, useState } from 'react';
import type { Size } from '@/lib/openai';
import { useT } from '@/lib/i18n';

const OPTIONS: { value: Size; label: string; w: number; h: number; auto?: boolean }[] = [
  { value: '1024x1024', label: '1:1', w: 24, h: 24 },
  { value: '1536x1024', label: '3:2', w: 30, h: 20 },
  { value: '1024x1536', label: '2:3', w: 18, h: 27 },
  { value: 'auto', label: 'auto', w: 28, h: 22, auto: true },
];
const PRESET_VALUES = OPTIONS.map((o) => o.value);

// 对齐到 16 的倍数并钳制到模型安全范围（多数兼容端点要求 16 倍数）
const round16 = (n: number) => Math.min(4096, Math.max(256, Math.round(n / 16) * 16));
const QUICK = [
  { label: '1K', px: 1024 },
  { label: '2K', px: 2048 },
  { label: '4K', px: 4096 },
];

export default function SizePicker({ value, onChange }: { value: Size; onChange: (v: Size) => void }) {
  const t = useT();
  const m = /^(\d+)x(\d+)$/.exec(value);
  const isCustom = !!m && !PRESET_VALUES.includes(value);
  const [open, setOpen] = useState(isCustom);
  const [w, setW] = useState(isCustom && m ? Number(m[1]) : 2048);
  const [h, setH] = useState(isCustom && m ? Number(m[2]) : 2048);

  const commit = (nw: number, nh: number) => {
    const cw = round16(nw);
    const ch = round16(nh);
    setW(cw);
    setH(ch);
    onChange(`${cw}x${ch}` as Size);
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-mut">{t('size.label')}</span>
        <button
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) commit(w, h); // 展开即应用为自定义
          }}
          className={`text-[11px] transition ${isCustom ? 'text-grass' : 'text-mut2 hover:text-fg2'}`}
        >
          {open ? `▾ ${t('size.custom')}` : `▸ ${t('size.custom')}`}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((o) => {
          const active = value === o.value && !isCustom;
          return (
            <button
              key={o.value}
              onClick={() => {
                setOpen(false);
                onChange(o.value);
              }}
              className={`rounded-[10px] border px-0 pb-2 pt-2.5 text-center transition ${
                active ? 'border-grass bg-grass/[0.06]' : 'border-line hover:border-[#3a3a44]'
              }`}
            >
              <span className="mx-auto mb-1.5 flex h-7 items-center justify-center">
                {o.auto ? (
                  <span className="rounded-[3px] border-[1.5px] border-dashed border-mut2" style={{ width: o.w, height: o.h }} />
                ) : (
                  <span className="rounded-[3px]" style={{ width: o.w, height: o.h, background: active ? '#0071e3' : '#86868b' }} />
                )}
              </span>
              <span className={`text-[11px] ${active ? 'text-fg' : 'text-fg2'}`}>{o.auto ? t('size.auto') : o.label}</span>
            </button>
          );
        })}
      </div>

      {open && (
        <div className={`mt-2 rounded-xl border p-3 ${isCustom ? 'border-grass/40 bg-grass/[0.04]' : 'border-line bg-panel2/40'}`}>
          <div className="flex items-center gap-2">
            <NumInput value={w} onCommit={(n) => commit(n, h)} />
            <span className="text-mut2">×</span>
            <NumInput value={h} onCommit={(n) => commit(w, n)} />
            <div className="ml-auto flex gap-1.5">
              {QUICK.map((qk) => (
                <button
                  key={qk.label}
                  onClick={() => commit(qk.px, qk.px)}
                  className="rounded-md border border-line px-2 py-1 text-[11px] text-fg2 transition hover:border-grass/50 hover:text-fg"
                >
                  {qk.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-mut2">{t('size.customHint')}</p>
        </div>
      )}
    </div>
  );
}

// 失焦/回车时对齐提交，输入中允许自由编辑
function NumInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]); // 对齐后同步显示
  return (
    <input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = Number(draft);
        if (Number.isFinite(n) && n > 0) onCommit(n);
        else setDraft(String(value));
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="w-[72px] rounded-lg border border-line bg-panel px-2 py-1.5 text-center font-mono text-[13px] text-fg outline-none focus:border-grass/50"
    />
  );
}
