import { useEffect, useRef, useState } from 'react';
import { listModels } from '@/lib/openai';
import type { ApiConfig } from '@/lib/config';
import { useT } from '@/lib/i18n';

const IMG = /image|dall.?e|flux|stable|sdxl|\bsd\b|imagen|recraft|ideogram|kolors|seedream|qwen-image|playground|kontext|hidream|wan|cog/i;

export default function ModelPicker({ cfg, value, onChange }: { cfg: ApiConfig; value: string; onChange: (v: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageOnly, setImageOnly] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (loading || !cfg.baseUrl || !cfg.apiKey) return;
    setLoading(true);
    setFailed(false);
    try {
      setModels(await listModels(cfg));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  // 点击外部关闭
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const base = imageOnly && models ? models.filter((m) => IMG.test(m)) : models ?? [];
  const kw = value.trim().toLowerCase();
  const options = base.filter((m) => !kw || m.toLowerCase().includes(kw)).slice(0, 60);

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="input pr-8"
        value={value}
        placeholder="gpt-image-1"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          if (models === null) load();
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mut">▾</span>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-panel2 shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5 text-[11px] text-mut">
            <div className="flex gap-1">
              {(['imageOnly', 'all'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setImageOnly(k === 'imageOnly')}
                  className={`rounded px-2 py-0.5 ${(k === 'imageOnly') === imageOnly ? 'bg-panel3 text-fg' : 'hover:text-fg2'}`}
                >
                  {t(k === 'imageOnly' ? 'model.imageOnly' : 'model.all')}
                </button>
              ))}
            </div>
            <button onClick={load} className="hover:text-fg2">
              {loading ? t('model.loading') : `↻ ${t('model.refresh')}`}
            </button>
          </div>
          <div className="max-h-60 overflow-auto p-1">
            {loading && <div className="px-2 py-2 text-[12px] text-mut">{t('model.loading')}</div>}
            {!loading && failed && <div className="px-2 py-2 text-[12px] text-amber-400">{t('model.failed')}</div>}
            {!loading && !failed && options.length === 0 && <div className="px-2 py-2 text-[12px] text-mut">{t('model.none')}</div>}
            {options.map((m) => (
              <button
                key={m}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className={`block w-full truncate rounded px-2 py-1.5 text-left font-mono text-[12px] transition hover:bg-panel3 ${
                  m === value ? 'text-grass' : 'text-fg2'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
