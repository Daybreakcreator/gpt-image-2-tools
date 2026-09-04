import { useEffect, useRef, useState } from 'react';
import {
  generateImages,
  generateImagesStream,
  editImages,
  srcToFile,
  testConnection,
  enhancePrompt,
  parseVoiceIntent,
  type GenerateParams,
  type ResultImage,
  type Quality,
  type TestResult,
} from '@/lib/openai';
import { loadConfig, saveConfig, isConfigured, importFromUrl, buildConfigLink, loadParams, saveParams, type ApiConfig } from '@/lib/config';
import { pushGroup, storageInfo, clearGroups } from '@/lib/groups';
import { pushPrompt } from '@/lib/history';
import { track } from '@/lib/track';
import { recordGeneration } from '@/lib/retention';
import { isVoiceSupported } from '@/lib/voice';
import PromptField from './PromptField';
import SizePicker from './SizePicker';
import Segmented from './Segmented';
import ImageAttach from './ImageAttach';
import ModelPicker from './ModelPicker';
import MaskEditor from './MaskEditor';
import Lightbox from './Lightbox';
import HostedUpsell from './HostedUpsell';
import { IconDice, IconClock, IconPencil, IconActivity, IconLink, IconBrush, IconSparkles, IconBulb } from './icons';
import { useT, useLang } from '@/lib/i18n';

const QUALITY_KEYS = [
  { value: 'low', key: 'q.standard' },
  { value: 'medium', key: 'q.hd' },
  { value: 'high', key: 'q.ultra' },
];
const N_OPTS = [1, 2, 4].map((n) => ({ value: String(n), label: String(n) }));
const MAX_IMAGES = 8; // 附图（底图+参考）上限

// 骨架/占位按所选尺寸比例显示，消除出图瞬间的布局抖动
function sizeAspect(size: string): string {
  const m = /^(\d+)x(\d+)$/.exec(size);
  return m ? `${m[1]} / ${m[2]}` : '1 / 1';
}

// 生成在后台标签完成时，闪一下标签页标题提示；切回页面即还原
function flashTitleWhenHidden(text: string) {
  if (typeof document === 'undefined' || !document.hidden) return;
  const prev = document.title;
  document.title = text;
  const restore = () => {
    if (document.hidden) return;
    document.title = prev;
    document.removeEventListener('visibilitychange', restore);
  };
  document.addEventListener('visibilitychange', restore);
}

export default function Playground() {
  const [cfg, setCfg] = useState<ApiConfig>(loadConfig());
  const [showSettings, setShowSettings] = useState(false);
  const [p, setP] = useState<GenerateParams>({
    size: '1024x1024',
    quality: 'medium',
    n: 1,
    output_format: 'png',
    background: 'auto',
    ...loadParams(), // 记住上次（不含 prompt）
    prompt: '',
  });
  const [tileLoading, setTileLoading] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ResultImage[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [mask, setMask] = useState<File | null>(null);
  const [maskOpen, setMaskOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [lastSource, setLastSource] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  // 本次生成的参数对比信息：请求值 vs 实测尺寸 + 端点改写的 prompt
  const [genMeta, setGenMeta] = useState<{ size: string; quality: string; model: string; durationMs: number; revised?: string } | null>(null);
  const [actualDims, setActualDims] = useState<{ w: number; h: number } | null>(null);
  const [partialFail, setPartialFail] = useState(0); // 本次并发里失败的张数
  const [filling, setFilling] = useState(false); // 正在补齐失败项
  const lastGenRef = useRef<{ p: GenerateParams; images: File[]; mask: File | null; isEdit: boolean } | null>(null);
  const [partials, setPartials] = useState<ResultImage[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [showHint, setShowHint] = useState(false); // 首次访问的功能引导（一次性）
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null); // 取消当前生成

  // 首次访问且浏览器支持语音时，提示「能说话 / 能拖拽调序」；看过即不再显示
  useEffect(() => {
    try {
      if (isVoiceSupported() && !localStorage.getItem('gi2_hint_v1')) setShowHint(true);
    } catch (e) {
      /* localStorage 不可用则不提示 */
    }
  }, []);
  function dismissHint() {
    setShowHint(false);
    try {
      localStorage.setItem('gi2_hint_v1', '1');
    } catch (e) {
      /* ignore */
    }
  }

  // 生成计时器：按真实时间戳算，后台标签被节流/冻结后回来仍显示正确秒数
  const elapsedStart = useRef(0);
  useEffect(() => {
    if (!loading) return;
    elapsedStart.current = Date.now();
    setElapsed(0);
    const tick = () => setElapsed(Math.floor((Date.now() - elapsedStart.current) / 1000));
    const t = setInterval(tick, 1000);
    const onVis = () => !document.hidden && tick(); // 切回来立刻校正
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loading]);

  const isEdit = images.length > 0;
  const configured = isConfigured(cfg);
  const t = useT();
  const lang = useLang();
  const QUALITY_OPTS = QUALITY_KEYS.map((q) => ({ value: q.value, label: t(q.key) }));

  useEffect(() => {
    const fromUrl = importFromUrl();
    let c = loadConfig();
    if (fromUrl) {
      c = { ...c, ...fromUrl };
      saveConfig(c);
      setImported(true);
      setTimeout(() => setImported(false), 3000);
    }
    setCfg(c);
    window.dispatchEvent(new Event('langchange')); // 刷新导航连接状态
  }, []);

  // 历史「回到这组」：从 localStorage 恢复提示词+参数
  useEffect(() => {
    try {
      const raw = localStorage.getItem('gpt-image-2:restore');
      if (!raw) return;
      localStorage.removeItem('gpt-image-2:restore');
      const r = JSON.parse(raw);
      setP((prev) => ({ ...prev, prompt: r.prompt ?? prev.prompt, size: r.size ?? prev.size, quality: r.quality ?? prev.quality }));
      setTimeout(() => document.getElementById('prompt-input')?.focus(), 200);
    } catch {
      /* ignore */
    }
  }, []);

  // 记住参数（不含 prompt）
  useEffect(() => {
    saveParams({ size: p.size, quality: p.quality, n: p.n, output_format: p.output_format, background: p.background });
  }, [p.size, p.quality, p.n, p.output_format, p.background]);

  // ⌘K / Ctrl+K 聚焦输入框
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('prompt-input')?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Showcase「用这个 Prompt 创作」→ 填入并滚到顶部
  useEffect(() => {
    function onUse(e: Event) {
      const d = (e as CustomEvent<string | { prompt: string; size?: GenerateParams['size']; quality?: Quality }>).detail;
      const next = typeof d === 'string' ? { prompt: d } : d;
      setImages([]);
      setMask(null);
      setP((prev) => ({
        ...prev,
        prompt: next.prompt,
        ...(next.size ? { size: next.size } : {}),
        ...(next.quality ? { quality: next.quality } : {}),
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => document.getElementById('prompt-input')?.focus(), 300);
    }
    window.addEventListener('use-prompt', onUse);
    return () => window.removeEventListener('use-prompt', onUse);
  }, []);

  // 全局拖拽：拖到页面任意位置都能感知，落下即附图进入改图
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setDragActive(true);
    };
    const onOver = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragActive(false);
    };
    const onDrop = (e: DragEvent) => {
      depth = 0;
      setDragActive(false);
      const imgs = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (!imgs.length) return;
      e.preventDefault();
      setImages((prev) => [...prev, ...imgs].slice(0, MAX_IMAGES));
      setMask(null);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  function persist(next: ApiConfig) {
    setCfg(next);
    saveConfig(next);
  }
  function changeImages(next: File[]) {
    setImages(next);
    setMask(null);
  }

  async function onGenerate(override?: Partial<GenerateParams>, imagesOverride?: File[]) {
    setError('');
    // 语音/外部传入的参数：合并进 eff 用于本次生成，并同步到 UI 控件
    const eff: GenerateParams = override ? { ...p, ...override } : p;
    if (override) setP((prev) => ({ ...prev, ...override }));
    // 语音重排后的图序：本次生成用 imgs，避免 setImages 异步导致的状态竞态
    const imgs = imagesOverride ?? images;
    if (!configured) {
      setShowSettings(true);
      setError('key:err.needKey');
      return;
    }
    if (!eff.prompt.trim()) return setError('key:err.needPrompt');
    setLoading(true);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
    // 捕获原图用于「前后对比」（仅改图）
    if (lastSource) URL.revokeObjectURL(lastSource);
    setLastSource(isEdit && imgs[0] ? URL.createObjectURL(imgs[0]) : null);
    setResults([]);
    setPartials([]);
    setGenMeta(null);
    setActualDims(null);
    setPartialFail(0);
    const ac = new AbortController();
    abortRef.current = ac;
    const t0 = Date.now();
    // 很多端点单次只回 1 张（无视 n）→ 并发 N 个单图请求，逐张出图
    const N = eff.n;
    const slots: (ResultImage | null)[] = Array(N).fill(null);
    const flush = () => setPartials(slots.filter(Boolean) as ResultImage[]);
    const single: GenerateParams = { ...eff, n: 1 };

    const tasks = Array.from({ length: N }, (_, i) =>
      (async () => {
        if (isEdit) {
          const r = await editImages(cfg, single, imgs, mask ?? undefined, ac.signal);
          if (r[0]) {
            slots[i] = r[0];
            flush();
          }
          return;
        }
        try {
          const r = await generateImagesStream(
            cfg,
            single,
            (cur) => {
              if (cur[0]) {
                slots[i] = cur[0];
                flush();
              }
            },
            ac.signal,
          );
          slots[i] = r[0] ?? (await generateImages(cfg, single, ac.signal))[0] ?? slots[i];
        } catch (e) {
          if (ac.signal.aborted) throw e; // 用户取消：别再回落重试
          const r = await generateImages(cfg, single, ac.signal);
          if (r[0]) slots[i] = r[0];
        }
        flush();
      })(),
    );

    try {
      const settled = await Promise.allSettled(tasks);
      if (ac.signal.aborted) return; // 用户取消：干净中断，不出结果/不入历史/不报错
      const final = slots.filter(Boolean) as ResultImage[];
      if (!final.length) {
        const rej = settled.find((s) => s.status === 'rejected') as PromiseRejectedResult | undefined;
        throw new Error(rej?.reason?.message ?? 'no image');
      }
      setResults(final);
      flashTitleWhenHidden(`✅ ${t('res.count', { n: final.length })} · GPT-Image-2`);
      setGenMeta({ size: eff.size, quality: eff.quality, model: cfg.model, durationMs: Date.now() - t0, revised: final.find((im) => im.revised)?.revised });
      setPartialFail(N - final.length); // 少出的张数 → 提示可补齐
      lastGenRef.current = { p: { ...eff, n: 1 }, images: imgs, mask, isEdit: imgs.length > 0 };
      pushPrompt(eff.prompt);
      pushGroup({
        id: `${t0}`,
        type: mask ? 'inpaint' : isEdit ? 'edit' : 't2i',
        prompt: eff.prompt,
        size: eff.size,
        quality: eff.quality,
        model: cfg.model,
        n: final.length,
        durationMs: Date.now() - t0,
        at: t0,
        images: final.map((im) => im.src),
      });
      // 匿名动作埋点（只传动作名，不含 prompt/key/图）
      track(mask ? 'inpaint' : isEdit ? 'edit' : 'generate');
      // 匿名留存里程碑（明细只存本机，只上报 first_gen/activated/returned 各一次）
      recordGeneration({ isIterate: isEdit || !!mask });
      // 匿名累计计数（只传数量，不含 prompt/key/图）
      fetch('/api/gen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ n: final.length }) })
        .then((r) => r.json())
        .then((d) => typeof d.images === 'number' && window.dispatchEvent(new CustomEvent('gen-counted', { detail: d.images })))
        .catch(() => {});
    } catch (e) {
      if (!ac.signal.aborted) {
        setError((e as Error).message);
        flashTitleWhenHidden(`⚠ ${t('res.failedTitle')} · GPT-Image-2`);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setPartials([]);
    }
  }

  function stopGenerate() {
    abortRef.current?.abort();
  }

  // 补齐本次失败的 count 张：用上次生成的同一套参数/图，追加到结果末尾
  async function fillMissing(count: number) {
    const last = lastGenRef.current;
    if (!configured || !last || count <= 0 || filling) return;
    setError('');
    setFilling(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const tasks = Array.from({ length: count }, () =>
        (async () => {
          const r = last.isEdit
            ? await editImages(cfg, last.p, last.images, last.mask ?? undefined, ac.signal)
            : await generateImages(cfg, last.p, ac.signal);
          return r[0] ?? null;
        })(),
      );
      const settled = await Promise.allSettled(tasks);
      if (ac.signal.aborted) return;
      const got = settled.map((s) => (s.status === 'fulfilled' ? s.value : null)).filter(Boolean) as ResultImage[];
      if (got.length) {
        setResults((r) => [...r, ...got]);
        setPartialFail((f) => Math.max(0, f - got.length));
      }
    } finally {
      abortRef.current = null;
      setFilling(false);
    }
  }

  async function continueFrom(img: ResultImage) {
    const file = await srcToFile(img.src, `from-result.${img.format}`);
    changeImages([file]);
    setResults([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 只重生成某一张
  async function regenOne(i: number) {
    if (!configured) return setShowSettings(true);
    setTileLoading(i);
    setError('');
    try {
      const one = { ...p, n: 1 };
      const imgs = isEdit ? await editImages(cfg, one, images, mask ?? undefined) : await generateImages(cfg, one);
      if (imgs[0]) setResults((r) => r.map((x, j) => (j === i ? imgs[0] : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTileLoading(null);
    }
  }

  function downloadAll() {
    results.forEach((img, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = img.src;
        a.download = `gpt-image-2-${i + 1}.${img.format}`;
        a.click();
      }, i * 200);
    });
  }

  const accent = isEdit ? 'iris' : 'grass';

  return (
    <>
      {imported && (
        <div role="status" aria-live="polite" className="fixed left-1/2 top-16 z-[60] -translate-x-1/2 animate-fade-in rounded-full border border-grass/30 bg-grass/15 px-4 py-2 text-xs text-grass">
          {t('import.done')}
        </div>
      )}
      <div className="apple-card grid overflow-hidden rounded-[28px] lg:grid-cols-[460px_1fr]">
        {/* ── Composer ── */}
        <div className="min-w-0 space-y-4 border-b border-linesoft p-5 sm:p-7 lg:border-b-0 lg:border-r lg:p-8">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
                isEdit ? 'border-iris/30 bg-iris/[0.12] text-iris' : 'border-grass/25 bg-grass/10 text-grass'
              }`}
            >
              {isEdit ? t('badge.i2i', { n: images.length }) : t('badge.t2i')}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-[.97] ${
                configured ? 'border border-line bg-white text-fg2 hover:border-mut2' : 'bg-fg text-white shadow-sm hover:bg-black'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-[#34c759]' : 'bg-white/60'}`} />
              {configured ? t('btn.settings') : t('btn.connect')}
            </button>
          </div>

          {showHint && (
            <div className="animate-fade-in hidden items-start gap-2 rounded-xl border border-grass/25 bg-grass/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-fg2 sm:flex">
              <IconBulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-grass" />
              <p className="flex-1">{t('hint.voice')}</p>
              <button onClick={dismissHint} aria-label={t('btn.clear')} className="grid h-4 w-4 place-items-center rounded text-mut transition hover:text-fg">×</button>
            </div>
          )}

          <PromptField
            value={p.prompt}
            onChange={(v) => setP({ ...p, prompt: v })}
            onSubmit={() => onGenerate()}
            showExamples={!isEdit}
            placeholder={isEdit ? t('prompt.placeholderEdit') : t('prompt.placeholder')}
            onEnhance={(text) => {
              track('enhance');
              return enhancePrompt(cfg, text, lang);
            }}
            onVoiceSubmit={(text, params, targetIndex) => {
              track('voice');
              dismissHint(); // 用过语音就别再提示了
              // 语音指明"改第N张" → 把它重排到首位（多数模型把第一张当底图，命中率更高）
              let imagesOverride: File[] | undefined;
              if (typeof targetIndex === 'number' && targetIndex > 0 && targetIndex < images.length) {
                const re = [...images];
                const [target] = re.splice(targetIndex, 1);
                re.unshift(target);
                imagesOverride = re;
                setImages(re); // 同步 UI 缩略图顺序
              }
              onGenerate({ prompt: text, ...params }, imagesOverride);
            }}
            onVoiceParse={(text) => parseVoiceIntent(cfg, text, { imageCount: images.length }, lang)}
          />

          <ImageAttach files={images} onChange={changeImages} max={MAX_IMAGES} />

          {images.length === 1 && (
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => setMaskOpen(true)}
                className="rounded-lg border border-iris/50 px-3 py-1.5 text-iris transition hover:bg-iris/15"
              >
                <span className="inline-flex items-center gap-1.5">
                  <IconBrush className="h-3.5 w-3.5" /> {t('btn.inpaint')}
                </span>
              </button>
              {mask && (
                <span className="flex items-center gap-1.5 text-grass">
                  {t('btn.maskSet')}
                  <button onClick={() => setMask(null)} className="text-mut hover:text-red-400">{t('btn.clear')}</button>
                </span>
              )}
            </div>
          )}

          <SizePicker value={p.size} onChange={(v) => setP({ ...p, size: v })} />
          <div className="grid grid-cols-2 gap-3.5">
            <Segmented label={t('seg.quality')} value={p.quality} options={QUALITY_OPTS} onChange={(v) => setP({ ...p, quality: v as Quality })} />
            <Segmented label={t('seg.count')} value={String(p.n)} options={N_OPTS} onChange={(v) => setP({ ...p, n: Number(v) })} />
          </div>
          <p className="-mt-1.5 text-[11px] text-mut2">{t(`q.hint.${p.quality}`)}</p>

          {/* desktop generate / stop */}
          {loading ? (
            <button
              onClick={stopGenerate}
              className="hidden h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-line text-[15px] text-fg2 transition hover:border-red-500/40 hover:text-red-300 lg:flex"
            >
              <Spinner /> {t('btn.generating')} <span className="opacity-60">· {t('btn.stop')}</span>
            </button>
          ) : (
            <button onClick={() => onGenerate()} className="btn-primary hidden h-[46px] w-full text-[15px] lg:flex">
              {!configured ? t('btn.connect') : results.length ? t('btn.regen') : t('btn.generate')}
              <span className="font-mono text-[11px] opacity-50">⌘↵</span>
            </button>
          )}
          {error && <ErrorCard msg={error} onSettings={() => setShowSettings(true)} onRetry={() => onGenerate()} />}
        </div>

        {/* ── Results ── */}
        <div ref={resultsRef} className="min-h-[560px] min-w-0 scroll-mt-20 bg-[#fafafa] p-5 sm:p-7 lg:p-8">
          {loading ? (
            partials.length > 0 ? (
              <StreamingPreview images={partials} elapsed={elapsed} />
            ) : (
              <Skeletons n={p.n} elapsed={elapsed} size={p.size} />
            )
          ) : results.length === 0 ? (
            <EmptyState configured={configured} onSettings={() => setShowSettings(true)} />
          ) : (
            <div className="flex flex-col">
              <div className="mb-4 flex items-baseline justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-medium text-fg">{t('res.title')}</span>
                  <span className="text-[11px] text-mut">{t('res.count', { n: results.length })}</span>
                </div>
                <div className="flex gap-2">
                  {p.prompt.trim() && (
                    <button
                      onClick={() => {
                        track('copy_prompt');
                        navigator.clipboard.writeText(p.prompt).then(() => {
                          setPromptCopied(true);
                          setTimeout(() => setPromptCopied(false), 1500);
                        });
                      }}
                      className="rounded-lg border border-line px-2.5 py-1 text-xs text-fg2 transition hover:border-[#3a3a44]"
                    >
                      {promptCopied ? `✓ ${t('btn.copied')}` : `⧉ ${t('btn.copyPrompt')}`}
                    </button>
                  )}
                  {results.length > 1 && (
                    <button onClick={downloadAll} className="rounded-lg border border-line px-2.5 py-1 text-xs text-fg2 transition hover:border-[#3a3a44]">
                      ↓ {t('btn.downloadAll')}
                    </button>
                  )}
                </div>
              </div>
              {partialFail > 0 && (
                <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  <span>{t('res.failed', { n: partialFail })}</span>
                  <button
                    onClick={() => fillMissing(partialFail)}
                    disabled={filling}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/40 px-2.5 py-1 text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    {filling ? <Spinner /> : '↻'} {t('res.retryFailed')}
                  </button>
                </div>
              )}
              {genMeta && <MetaCard meta={genMeta} actual={actualDims} />}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {results.map((img, i) => (
                  <figure
                    key={i}
                    onClick={() => setLightbox(i)}
                    className="group relative animate-fade-in-up cursor-zoom-in overflow-hidden rounded-2xl border border-line"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <img
                      src={img.src}
                      alt=""
                      loading="lazy"
                      onLoad={(e) => {
                        e.currentTarget.classList.remove('opacity-0');
                        if (i === 0) setActualDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
                      }}
                      className="w-full opacity-0 transition duration-500"
                    />
                    {tileLoading === i && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/60 backdrop-blur-sm">
                        <Spinner />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          regenOne(i);
                        }}
                        className="pointer-events-auto mr-auto flex items-center gap-1.5 rounded-[9px] border border-line bg-panel/85 px-2.5 py-1.5 text-xs text-fg backdrop-blur transition hover:border-[#3a3a44]"
                      >
                        <IconDice className="h-3.5 w-3.5" /> {t('btn.reroll')}
                      </button>
                      <a
                        href={img.src}
                        download={`gpt-image-2-${i + 1}.${img.format}`}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto flex items-center gap-1.5 rounded-[9px] border border-line bg-panel/85 px-2.5 py-1.5 text-xs text-fg backdrop-blur transition hover:border-[#3a3a44]"
                      >
                        ↓ {t('btn.download')}
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          continueFrom(img);
                        }}
                        className="pointer-events-auto flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-xs font-medium text-white"
                        style={{ background: '#a78bfa', boxShadow: '0 4px 16px rgba(167,139,250,.4)' }}
                      >
                        ⟳ {t('btn.continue')}
                      </button>
                    </div>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* mobile sticky generate */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        {error && (
          <div className="mb-2">
            <ErrorCard msg={error} onSettings={() => setShowSettings(true)} onRetry={() => onGenerate()} />
          </div>
        )}
        {loading ? (
          <button
            onClick={stopGenerate}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-line text-[15px] text-fg2 transition hover:border-red-500/40 hover:text-red-300"
          >
            <Spinner /> {t('btn.generating')} <span className="opacity-60">· {t('btn.stop')}</span>
          </button>
        ) : (
          <button onClick={() => onGenerate()} className="btn-primary h-[46px] w-full text-[15px]">
            {!configured ? t('btn.connect') : isEdit ? t('btn.editGen') : t('btn.generate')}
          </button>
        )}
      </div>
      <div className="h-24 lg:hidden" aria-hidden />

      {/* 全屏拖拽遮罩 */}
      {dragActive && <DropOverlay />}

      {/* 设置弹层 */}
      {showSettings && <SettingsModal cfg={cfg} onChange={persist} onClose={() => setShowSettings(false)} configured={configured} />}

      {/* 结果灯箱 */}
      {lightbox !== null && results[lightbox] && (
        <Lightbox
          images={results}
          index={lightbox}
          source={lastSource}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
          onContinue={(img) => {
            setLightbox(null);
            continueFrom(img);
          }}
        />
      )}

      {/* 局部重绘 */}
      {maskOpen && images[0] && (
        <MaskEditor
          file={images[0]}
          onApply={(m) => {
            setMask(m);
            setMaskOpen(false);
          }}
          onCancel={() => setMaskOpen(false)}
        />
      )}
    </>
  );
}

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

function Skeletons({ n, elapsed, size }: { n: number; elapsed: number; size: string }) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center gap-1">
        <Dot /> <Dot d=".2s" /> <Dot d=".4s" />
        <span className="ml-2 text-[13px] text-fg2">{t('res.rendering')}</span>
        <span className="ml-1 text-[12px] text-mut">· {elapsed}s</span>
      </div>
      <p className="mb-4 mt-1.5 text-[11px] text-mut2">{t('res.bgHint')}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="shimmer-bg rounded-2xl border border-line" style={{ animationDelay: `${i * 0.15}s`, aspectRatio: sizeAspect(size) }} />
        ))}
      </div>
    </div>
  );
}
function Dot({ d = '0s' }: { d?: string }) {
  return <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-grass" style={{ animationDelay: d }} />;
}

function StreamingPreview({ images, elapsed }: { images: ResultImage[]; elapsed: number }) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center gap-1">
        <Dot /> <Dot d=".2s" /> <Dot d=".4s" />
        <span className="ml-2 text-[13px] text-fg2">{t('res.rendering')}</span>
        <span className="ml-1 text-[12px] text-mut">· {elapsed}s</span>
      </div>
      <p className="mb-4 mt-1.5 text-[11px] text-mut2">{t('res.bgHint')}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {images.map((img, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl border border-line">
            <img src={img.src} alt="" className="w-full animate-fade-in" />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-grass/25" />
          </div>
        ))}
      </div>
    </div>
  );
}

const Q_LABEL: Record<string, string> = { low: 'q.standard', medium: 'q.hd', high: 'q.ultra', auto: 'size.auto' };

// 参数对比卡片：请求 vs 实测尺寸 + 端点是否改写了 prompt
function MetaCard({ meta, actual }: { meta: { size: string; quality: string; model: string; durationMs: number; revised?: string }; actual: { w: number; h: number } | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const concrete = /^\d+x\d+$/.test(meta.size);
  const reqLabel = meta.size === 'auto' ? t('size.auto') : meta.size.replace('x', '×');
  const actLabel = actual ? `${actual.w}×${actual.h}` : '…';
  const mismatch = !!actual && concrete && `${actual.w}x${actual.h}` !== meta.size;
  return (
    <div className="mb-4 rounded-xl border border-line bg-panel/40 px-3 py-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-mut">
        <span>
          {t('meta.requested')} <span className="text-fg2">{reqLabel}</span>
        </span>
        {(actual || concrete) && (
          <span title={mismatch ? t('meta.mismatch') : undefined} className={mismatch ? 'text-amber-400' : ''}>
            {t('meta.actual')} <span className={mismatch ? 'font-medium' : 'text-fg2'}>{actLabel}</span>
            {mismatch && ' ⚠'}
          </span>
        )}
        <span>· {t(Q_LABEL[meta.quality] ?? 'q.hd')}</span>
        <span className="truncate">· {meta.model}</span>
        <span className="ml-auto inline-flex items-center gap-1"><IconClock className="h-3.5 w-3.5" /> {(meta.durationMs / 1000).toFixed(1)}s</span>
      </div>
      {meta.revised && (
        <div className="mt-1.5 border-t border-linesoft pt-1.5">
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-amber-400/90 hover:text-amber-300">
            <IconPencil className="h-3.5 w-3.5" /> {t('meta.revised')} <span className="text-mut2">{open ? '▾' : '▸'}</span>
          </button>
          {open && <p className="mt-1 whitespace-pre-wrap leading-relaxed text-fg2">{meta.revised}</p>}
        </div>
      )}
    </div>
  );
}

function EmptyState({ configured, onSettings }: { configured: boolean; onSettings: () => void }) {
  const t = useT();
  return (
    <div className="relative flex min-h-[496px] items-center justify-center overflow-hidden rounded-[22px] border border-black/[0.04] bg-white">
      <div
        className="absolute inset-0 opacity-60"
        style={{ backgroundImage: 'radial-gradient(#d2d2d7 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      <div className="relative max-w-[420px] px-6 text-center">
        <div
          className="relative mx-auto mb-5 flex h-[84px] w-[84px] items-center justify-center rounded-3xl border border-line"
          style={{ background: 'linear-gradient(160deg,#ffffff,#f2f2f7)', boxShadow: '0 14px 38px rgba(0,0,0,.08)' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="24" height="24" rx="4" stroke="#86868b" strokeWidth="1.5" />
            <circle cx="11" cy="11" r="2" fill="#86868b" />
            <path d="M5 22 L11 16 L16 21 L20 17 L27 24" stroke="#86868b" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-grass" style={{ boxShadow: '0 4px 12px rgba(0,113,227,.3)' }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </span>
        </div>
        <div className="mb-2 text-xl font-semibold text-fg">{configured ? t('empty.title') : t('empty.connectTitle')}</div>
        <div className="text-[13px] leading-relaxed text-mut">
          {(configured ? t('empty.sub') : t('empty.connectSub')).split('\n').map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </div>
        {configured ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3.5 py-2 text-xs text-fg2">
            <IconBulb className="h-3.5 w-3.5" /> <span className="font-mono text-fg">⌘V</span> {t('empty.paste')}
          </div>
        ) : (
          <button onClick={onSettings} className="mt-6 inline-flex items-center rounded-full bg-grass px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(0,113,227,.2)] transition hover:brightness-105 active:scale-[.98]">
            {t('btn.connect')} →
          </button>
        )}
      </div>
    </div>
  );
}

function DropOverlay() {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 backdrop-blur-sm">
      <div className="pointer-events-none text-center">
        <div
          className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-3xl border"
          style={{
            background: 'linear-gradient(160deg,rgba(167,139,250,.18),rgba(167,139,250,.04))',
            borderColor: 'rgba(167,139,250,.35)',
            boxShadow: '0 0 60px rgba(167,139,250,.25), inset 0 0 30px rgba(167,139,250,.08)',
          }}
        >
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path d="M22 6 v22 m0 0 L12 18 m10 10 L32 18" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 30 v6 a2 2 0 0 0 2 2 h24 a2 2 0 0 0 2 -2 v-6" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="mb-2.5 text-[28px] font-bold tracking-tight text-fg">{t('drop.title')}</div>
        <div className="text-base text-iris">{t('drop.sub')}</div>
      </div>
    </div>
  );
}

function SettingsModal({
  cfg,
  onChange,
  onClose,
  configured,
}: {
  cfg: ApiConfig;
  onChange: (c: ApiConfig) => void;
  onClose: () => void;
  configured: boolean;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);
  const [showText, setShowText] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [info, setInfo] = useState<{ groups: number; images: number; mb: number } | null>(null);
  useEffect(() => {
    storageInfo().then(setInfo);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  // 配置一变，旧测试结果作废
  useEffect(() => setTest(null), [cfg.baseUrl, cfg.apiKey, cfg.model]);

  async function runTest() {
    setTesting(true);
    setTest(null);
    setTest(await testConnection(cfg));
    setTesting(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-md" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-md animate-fade-in-up overflow-y-auto overscroll-contain rounded-[24px] border border-white/70 bg-panel p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 id="settings-title" className="text-base font-semibold text-fg">{t('set.title')}</h2>
          <button type="button" onClick={onClose} className="-mr-2 min-h-9 rounded-lg px-2 text-sm text-fg2 transition hover:bg-panel2 hover:text-fg">{t('set.close')}</button>
        </div>
        <p className="mb-5 text-xs leading-relaxed text-mut">{t('set.privacy')}</p>
        <div className="space-y-4">
          <Field label={t('set.baseUrl')} hint={t('set.baseUrlHint')}>
            <input className="input" value={cfg.baseUrl} placeholder="https://api.openai.com/v1" onChange={(e) => onChange({ ...cfg, baseUrl: e.target.value })} />
          </Field>
          <Field label={t('set.key')} hint={t('set.keyHint')}>
            <div className="relative">
              <input
                className="input pr-24"
                type={showKey ? 'text' : 'password'}
                value={cfg.apiKey}
                placeholder="sk-..."
                onChange={(e) => onChange({ ...cfg, apiKey: e.target.value })}
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2 text-[11px]">
                {cfg.apiKey && (
                  <button onClick={() => setShowKey((v) => !v)} className="text-mut hover:text-fg">
                    {showKey ? t('set.keyHide') : t('set.keyShow')}
                  </button>
                )}
                {cfg.apiKey && (
                  <button onClick={() => onChange({ ...cfg, apiKey: '' })} className="text-mut hover:text-red-400">
                    {t('btn.clear')}
                  </button>
                )}
              </div>
            </div>
          </Field>
          <p className="-mt-1 text-[11px] text-mut">
            {t('set.noKey')}{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-grass hover:underline">
              {t('set.getKey')}
            </a>
          </p>
          <HostedUpsell />
          <Field label={t('set.model')}>
            <ModelPicker cfg={cfg} value={cfg.model} onChange={(m) => onChange({ ...cfg, model: m })} />
          </Field>
        </div>

        {/* ✨ 优化用的文本端点（可选，可折叠） */}
        <button onClick={() => setShowText((v) => !v)} className="mt-3 flex items-center gap-1 text-xs text-mut hover:text-fg2">
          <span>{showText ? '▾' : '▸'}</span> <IconSparkles className="h-3.5 w-3.5" /> {t('set.textSection')}
        </button>
        {showText && (
          <div className="mt-2 space-y-4 rounded-xl border border-line bg-panel2/40 p-3">
            <Field label={t('set.textBaseUrl')} hint={t('set.textBaseUrlHint')}>
              <input className="input" value={cfg.textBaseUrl ?? ''} placeholder={cfg.baseUrl} onChange={(e) => onChange({ ...cfg, textBaseUrl: e.target.value })} />
            </Field>
            <Field label={t('set.textKey')} hint={t('set.textKeyHint')}>
              <input className="input" type="password" value={cfg.textApiKey ?? ''} placeholder="sk-..." onChange={(e) => onChange({ ...cfg, textApiKey: e.target.value })} />
            </Field>
            <Field label={t('set.textModel')} hint={t('set.textModelHint')}>
              <input className="input" value={cfg.textModel ?? ''} placeholder="gpt-4o-mini" onChange={(e) => onChange({ ...cfg, textModel: e.target.value })} />
            </Field>
          </div>
        )}

        {/* 测试连接（用免费的 /models 探活，不产生生成费用） */}
        <div className="mt-4">
          <button
            onClick={runTest}
            disabled={testing || !configured}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2 text-sm text-fg2 transition hover:border-[#3a3a44] disabled:opacity-40"
          >
            {testing ? (
              <>
                <Spinner /> {t('test.testing')}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <IconActivity className="h-4 w-4" /> {test ? t('test.retest') : t('test.btn')}
              </span>
            )}
          </button>
          {test && (
            <div aria-live="polite" className="mt-2 space-y-1.5 rounded-xl border border-line bg-panel2/40 p-3">
              {test.steps.map((s, i) => {
                const note = s.note === 'needFill' ? t('test.needFill') : s.note === 'unreachable' ? t('test.unreachable') : s.note === 'timeout' ? t('test.timeout') : s.note;
                return (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <span className={s.state === 'ok' ? 'text-grass' : s.state === 'warn' ? 'text-amber-400' : 'text-red-400'}>
                      {s.state === 'ok' ? '✓' : s.state === 'warn' ? '!' : '✗'}
                    </span>
                    <span className="text-fg2">{t(s.key)}</span>
                    {note && <span className="ml-auto truncate pl-2 text-[11px] text-mut">{note}</span>}
                  </div>
                );
              })}
              <div className={`pt-1 text-[12px] font-medium ${test.level === 'ok' ? 'text-grass' : test.level === 'warn' ? 'text-amber-400' : 'text-red-400'}`}>
                {test.level === 'ok' ? t('test.allset') : t('test.hasIssue')}
              </div>
            </div>
          )}
        </div>

        {/* 历史与存储 */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-panel2/40 px-3 py-2.5">
          <div>
            <div className="text-xs text-fg2">{t('set.storage')}</div>
            {info && <div className="mt-0.5 text-[11px] text-mut">{t('set.storageUsed', { g: info.groups, i: info.images, mb: info.mb })}</div>}
          </div>
          <button
            onClick={() => clearGroups().then(() => setInfo({ groups: 0, images: 0, mb: 0 }))}
            disabled={!info || info.groups === 0}
            className="rounded-lg border border-line px-2.5 py-1 text-xs text-mut transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
          >
            {info && info.groups === 0 ? t('set.cleared') : t('set.clearHistory')}
          </button>
        </div>

        <button onClick={onClose} disabled={!configured} className="btn-primary mt-6 h-11 w-full text-sm">
          {configured ? t('set.done') : t('set.needFill')}
        </button>
        {configured && (
          <button
            onClick={() => {
              track('share_link');
              navigator.clipboard.writeText(buildConfigLink(cfg)).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="mt-3 w-full text-center text-[11px] text-mut2 hover:text-fg2"
          >
            {copied ? t('set.linkCopied') : <span className="inline-flex items-center gap-1"><IconLink className="h-3.5 w-3.5" /> {t('set.copyLink')}</span>}
          </button>
        )}
      </div>
    </div>
  );
}

function classifyError(t: (k: string) => string, msg: string): { text: string; settings?: boolean; retry?: boolean } {
  if (msg.startsWith('key:')) {
    const k = msg.slice(4);
    return { text: t(k), settings: k === 'err.needKey' };
  }
  const m = msg.toLowerCase();
  if (/401|unauthorized|invalid.*key|incorrect api key|invalid_api_key/.test(m)) return { text: t('err.auth'), settings: true };
  if (/429|rate.?limit|too many/.test(m)) return { text: t('err.rate'), retry: true };
  if (/quota|insufficient|billing|exceeded|余额/.test(m)) return { text: t('err.quota'), settings: true };
  if (/failed to fetch|networkerror|cors|enotfound|timeout|fetch/.test(m)) return { text: t('err.network'), settings: true, retry: true };
  return { text: msg, retry: true };
}

function ErrorCard({ msg, onSettings, onRetry }: { msg: string; onSettings: () => void; onRetry: () => void }) {
  const t = useT();
  const a = classifyError(t, msg);
  return (
    <div role="alert" className="animate-fade-in rounded-xl border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-800">
      <div>{a.text}</div>
      {(a.settings || a.retry) && (
        <div className="mt-2 flex gap-2">
          {a.settings && (
            <button onClick={onSettings} className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-800 hover:bg-red-100">
              {t('btn.toSettings')}
            </button>
          )}
          {a.retry && (
            <button onClick={onRetry} className="rounded-lg border border-line px-2.5 py-1 text-xs text-fg2 hover:border-[#3a3a44]">
              {t('btn.retry')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-xs font-medium text-fg2">{label}</span>
        {hint && <span className="text-[11px] text-mut2">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
