import { useEffect, useMemo, useState } from 'react';
import { loadGroups, deleteGroup, deleteGroups, clearGroups, dayLabel, hhmm, type GenGroup, type GenType } from '@/lib/groups';
import { useLang, useT } from '@/lib/i18n';
import { IconTrash, IconCheck, IconCheckSquare } from './icons';

const RATIO: Record<string, string> = { '1024x1024': '1:1', '1536x1024': '3:2', '1024x1536': '2:3', auto: 'auto' };
const Q: Record<string, string> = { low: 'q.standard', medium: 'q.hd', high: 'q.ultra' };

export default function GalleryView() {
  const t = useT();
  const lang = useLang();
  const [groups, setGroups] = useState<GenGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState<GenType | 'all'>('all');
  const [time, setTime] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [q, setQ] = useState('');
  const [selMode, setSelMode] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const refresh = () => loadGroups().then(setGroups);
  const toggleSel = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const exitSel = () => {
    setSelMode(false);
    setSel(new Set());
  };
  useEffect(() => {
    loadGroups().then((g) => {
      setGroups(g);
      setLoaded(true);
    });
  }, []);

  // 类型计数（按图片数）
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, t2i: 0, edit: 0, inpaint: 0 };
    for (const g of groups) {
      c.all += g.n;
      c[g.type] += g.n;
    }
    return c;
  }, [groups]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const inTime = (at: number) => {
      if (time === 'all') return true;
      const days = (now - at) / 86400000;
      if (time === 'today') return new Date(at).toDateString() === new Date().toDateString();
      if (time === 'week') return days <= 7;
      return days <= 31;
    };
    const kw = q.trim().toLowerCase();
    return groups.filter((g) => (type === 'all' || g.type === type) && inTime(g.at) && (!kw || g.prompt.toLowerCase().includes(kw)));
  }, [groups, type, time, q]);

  // 按日期分组
  const byDay = useMemo(() => {
    const map = new Map<string, GenGroup[]>();
    for (const g of filtered) {
      const k = dayLabel(g.at, lang);
      (map.get(k) ?? map.set(k, []).get(k)!).push(g);
    }
    return [...map.entries()];
  }, [filtered, lang]);

  function restore(g: GenGroup) {
    localStorage.setItem('gpt-image-2:restore', JSON.stringify({ prompt: g.prompt, size: g.size, quality: g.quality }));
    location.href = '/';
  }
  function exportGroup(g: GenGroup) {
    g.images.forEach((src, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = src;
        a.download = `${g.id}-${i + 1}.png`;
        a.click();
      }, i * 200);
    });
  }

  function batchExport() {
    let k = 0;
    for (const g of groups) {
      if (!sel.has(g.id)) continue;
      g.images.forEach((src, i) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = src;
          a.download = `${g.id}-${i + 1}.png`;
          a.click();
        }, k++ * 200);
      });
    }
  }

  function batchDelete() {
    deleteGroups([...sel]).then(() => {
      exitSel();
      refresh();
    });
  }

  const totalImgs = groups.reduce((s, g) => s + g.n, 0);
  const typeChips: (GenType | 'all')[] = ['all', 't2i', 'edit', 'inpaint'];
  const timeChips = ['today', 'week', 'month', 'all'] as const;

  if (!loaded) return null;
  if (groups.length === 0) {
    return (
      <p className="text-sm text-mut">
        {t('hist.empty')} ·{' '}
        <a href="/" className="text-grass">
          {t('hist.emptyLink')}
        </a>
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* 工具条 */}
      <div className="space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('hist.search')}
          className="input max-w-md"
        />
        <div className="flex flex-wrap items-center gap-2">
          {typeChips.map((ty) => (
            <button
              key={ty}
              onClick={() => setType(ty)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${type === ty ? 'bg-panel2 font-medium text-fg' : 'border border-line text-fg2 hover:border-[#3a3a44]'}`}
            >
              {t(`type.${ty === 'all' ? 'all' : ty}`)} <span className="text-mut">{counts[ty]}</span>
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          {timeChips.map((tm) => (
            <button
              key={tm}
              onClick={() => setTime(tm)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${time === tm ? 'bg-panel2 font-medium text-fg' : 'border border-line text-fg2 hover:border-[#3a3a44]'}`}
            >
              {t(`time.${tm}`)}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-mut">
          <span>{t('hist.note', { n: 200 })}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => (selMode ? exitSel() : setSelMode(true))} className={selMode ? 'text-grass' : 'hover:text-fg2'}>
              {selMode ? (
                <span className="inline-flex items-center gap-1">
                  <IconCheck className="h-3.5 w-3.5" /> {t('sel.cancel')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <IconCheckSquare className="h-3.5 w-3.5" /> {t('sel.enter')}
                </span>
              )}
            </button>
            <button onClick={() => clearGroups().then(refresh)} className="hover:text-red-400">
              {t('hist.clearAll')}
            </button>
          </div>
        </div>
      </div>

      {/* 分组 */}
      {byDay.map(([day, gs]) => (
        <div key={day} className="space-y-3">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-medium text-fg">{day}</span>
            <span className="text-xs text-mut">· {gs.length}</span>
          </div>
          {gs.map((g) => {
            const checked = sel.has(g.id);
            return (
            <div
              key={g.id}
              onClick={selMode ? () => toggleSel(g.id) : undefined}
              className={`rounded-2xl border bg-panel/40 p-3.5 transition ${selMode ? 'cursor-pointer ' : ''}${
                checked ? 'border-grass/60 ring-1 ring-grass/40' : 'border-line'
              }`}
            >
              <div className="flex items-start gap-3">
                {selMode && (
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] ${
                      checked ? 'border-grass bg-grass text-white' : 'border-line text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                )}
                {/* 缩略图 */}
                <div className="flex shrink-0 gap-1.5">
                  {g.images.slice(0, 2).map((src, i) => (
                    <img key={i} src={src} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" loading="lazy" />
                  ))}
                  {g.images.length > 2 && (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-line bg-panel2 text-xs text-mut">
                      +{g.images.length - 2}
                    </div>
                  )}
                </div>
                {/* 信息 */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 inline-flex rounded-full bg-panel2 px-2 py-0.5 text-[11px] text-fg2">{t(`type.${g.type}`)}</div>
                  <p className="line-clamp-2 text-[13px] text-fg">{g.prompt || '—'}</p>
                  <div className="mt-1.5 text-[11px] text-mut">
                    {hhmm(g.at)} · {g.n} · {RATIO[g.size] ?? g.size} · {t(Q[g.quality] ?? 'q.hd')} · {(g.durationMs / 1000).toFixed(1)}s
                  </div>
                </div>
                {/* 操作 */}
                {!selMode && (
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button onClick={() => restore(g)} className="rounded-lg bg-grass px-2.5 py-1 text-[11px] font-medium text-white">
                      {t('hist.restore')}
                    </button>
                    <div className="flex gap-2 text-[11px] text-mut">
                      <button onClick={() => exportGroup(g)} className="hover:text-fg2">{t('hist.export')}</button>
                      <button
                        onClick={() => deleteGroup(g.id).then(refresh)}
                        className="hover:text-red-400"
                      >
                        {t('hist.delete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      ))}

      {/* 多选批量操作条 */}
      {selMode && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <span className="text-sm text-fg2">{t('sel.count', { n: sel.size })}</span>
            <button
              onClick={() => setSel(new Set(filtered.map((g) => g.id)))}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-fg2 transition hover:border-[#3a3a44]"
            >
              {t('sel.all')}
            </button>
            <div className="ml-auto flex gap-2">
              <button
                onClick={batchExport}
                disabled={sel.size === 0}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-fg2 transition hover:border-[#3a3a44] disabled:opacity-40"
              >
                ↓ {t('sel.export')}
              </button>
              <button
                onClick={batchDelete}
                disabled={sel.size === 0}
                className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/15 disabled:opacity-40"
              >
                <span className="inline-flex items-center gap-1">
                  <IconTrash className="h-3.5 w-3.5" /> {t('sel.delete')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {selMode && <div className="h-20" aria-hidden />}
    </div>
  );
}
