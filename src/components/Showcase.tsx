import { useMemo, useState } from 'react';
import { SHOWCASE, CATEGORIES, shotTitle, shotPrompt, shotImage, shotSize, type Shot, type ShotCat } from '@/lib/showcase';
import { useLang, useT } from '@/lib/i18n';
import { IconFilm, IconMountain, IconPalette, IconBox, IconFood, IconBuilding } from './icons';

const CAT_ICON: Record<string, typeof IconFilm> = {
  cinematic: IconFilm,
  scenery: IconMountain,
  art: IconPalette,
  product: IconBox,
  food: IconFood,
  arch: IconBuilding,
};

const H: Record<Shot['ratio'], string> = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
};
const RATIO_LABEL: Record<Shot['ratio'], string> = { square: '1:1', portrait: '2:3', landscape: '3:2' };
const Q_LABEL: Record<string, string> = { low: 'q.standard', medium: 'q.hd', high: 'q.ultra' };

export default function Showcase() {
  const t = useT();
  const lang = useLang();
  const [cat, setCat] = useState<ShotCat | 'all'>('all');
  const [copied, setCopied] = useState<string | null>(null);

  const shots = useMemo(() => (cat === 'all' ? SHOWCASE : SHOWCASE.filter((s) => s.cat === cat)), [cat]);

  // 点卡片 = 连 prompt + 推荐尺寸/质量一起填入
  function use(s: Shot) {
    window.dispatchEvent(new CustomEvent('use-prompt', { detail: { prompt: shotPrompt(s, lang), size: shotSize(s), quality: s.quality } }));
  }
  function copy(s: Shot) {
    navigator.clipboard.writeText(shotPrompt(s, lang)).then(() => {
      setCopied(s.id);
      setTimeout(() => setCopied((c) => (c === s.id ? null : c)), 1500);
    });
  }

  const chips: (ShotCat | 'all')[] = ['all', ...CATEGORIES];

  return (
    <section className="mt-14">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-fg">{t('showcase.title')}</h2>
        <p className="mt-1 text-sm text-mut">{t('showcase.sub')}</p>
      </div>

      {/* 主题分类 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map((c) => {
          const Icn = CAT_ICON[c];
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${
                cat === c ? 'bg-iris font-medium text-ink' : 'border border-line text-fg2 hover:border-iris/50'
              }`}
            >
              {Icn && <Icn className="h-3.5 w-3.5" />}
              {t(`cat.${c}`)}
            </button>
          );
        })}
      </div>

      <div className="[column-fill:_balance] gap-4 sm:columns-2 lg:columns-3">
        {shots.map((s) => (
          <div
            key={s.id}
            onClick={() => use(s)}
            className="group relative mb-4 block w-full cursor-pointer overflow-hidden rounded-2xl border border-line text-left transition hover:border-iris/50"
          >
            {shotImage(s) ? (
              <img src={shotImage(s)} alt={shotTitle(s, lang)} className={`w-full ${H[s.ratio]} object-cover`} loading="lazy" />
            ) : (
              <div className={`w-full ${H[s.ratio]}`} style={{ background: s.gradient }} />
            )}

            {/* hover overlay */}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
              <div className="line-clamp-3 text-[12px] leading-snug text-neutral-200">{shotPrompt(s, lang)}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-iris px-2.5 py-1 text-[11px] font-medium text-ink">
                  ↑ {t('showcase.use')}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copy(s);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/25 bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur transition hover:bg-black/60"
                >
                  {copied === s.id ? `✓ ${t('btn.copied')}` : `⧉ ${t('btn.copyPrompt')}`}
                </button>
              </div>
            </div>

            {/* always-visible title chip */}
            <span className="absolute left-2 top-2 rounded-md bg-black/45 px-2 py-0.5 text-[11px] text-white backdrop-blur transition group-hover:opacity-0">
              {shotTitle(s, lang)}
            </span>
            {/* 推荐参数标签 */}
            <span className="absolute right-2 top-2 rounded-md bg-black/45 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur transition group-hover:opacity-0">
              {RATIO_LABEL[s.ratio]} · {t(Q_LABEL[s.quality] ?? 'q.hd')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
