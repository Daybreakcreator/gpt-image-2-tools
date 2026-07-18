import { useEffect, useRef, useState } from 'react';
import { STYLE_TAGS, tagLabel, type StyleTag } from '@/lib/prompts';
import { SHOWCASE, shotPrompt, shotTitle, shotThumb } from '@/lib/showcase';
import { useLang, useT } from '@/lib/i18n';
import { loadPrompts } from '@/lib/history';
import { createRecognizer, isVoiceSupported, parseVoiceCommand, type VoiceParams } from '@/lib/voice';
import { IconUndo, IconSparkles, IconDice, IconClock } from './icons';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  showExamples?: boolean;
  onEnhance?: (text: string) => Promise<string>; // ✨ AI 优化
  onVoiceSubmit?: (text: string, params: VoiceParams, targetIndex?: number) => void; // 🎤 语音说完自动生成
  onVoiceParse?: (text: string) => Promise<{ prompt: string; targetIndex?: number }>; // 🎤 说完做意图解析（纠错+角色化）
}

export default function PromptField({ value, onChange, onSubmit, placeholder, showExamples = true, onEnhance, onVoiceSubmit, onVoiceParse }: Props) {
  const t = useT();
  const lang = useLang();
  const [seed, setSeed] = useState(0);

  // 🎤 语音输入（浏览器原生，免费）：边说边进输入框，说完自动纠错再生成
  const voiceOK = isVoiceSupported();
  const [listening, setListening] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  // 语音状态提示（失败/进行中/多图结果），避免静默失败
  const [voiceMsg, setVoiceMsg] = useState<{ text: string; kind: 'err' | 'info' } | null>(null);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const baseRef = useRef('');
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      recRef.current?.stop();
      if (msgTimer.current) clearTimeout(msgTimer.current);
    },
    [],
  );
  // info 类提示几秒后自动消失；err 类保留到下次操作
  function flashInfo(text: string) {
    setVoiceMsg({ text, kind: 'info' });
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setVoiceMsg(null), 4000);
  }
  function voiceErrText(code: string): string {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return t('voice.err.notAllowed');
      case 'no-speech':
        return t('voice.err.noSpeech');
      case 'audio-capture':
        return t('voice.err.noMic');
      case 'network':
        return t('voice.err.network');
      case 'aborted':
        return ''; // 用户主动停止，不提示
      default:
        return t('voice.err.generic');
    }
  }
  function toggleVoice() {
    if (!voiceOK || correcting) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    setVoiceMsg(null); // 开始新一轮，清掉旧提示
    if (msgTimer.current) clearTimeout(msgTimer.current);
    baseRef.current = value.trim();
    // base + 片段 拼接（已有内容则逗号续写）
    const mk = (s: string) => (baseRef.current && s ? `${baseRef.current}, ${s}` : s || baseRef.current);
    const rec = createRecognizer({
      lang,
      onInterim: (it) => onChange(mk(it)), // 边说边输出原始转写
      onFinal: async (ft) => {
        const { prompt: spoken, params } = parseVoiceCommand(ft, lang);
        const raw = mk(spoken);
        onChange(raw); // 先落原始结果
        let finalText = raw;
        let targetIndex: number | undefined;
        if (onVoiceParse && spoken.trim()) {
          setCorrecting(true);
          setVoiceMsg({ text: t('voice.parsing'), kind: 'info' }); // 进行中提示
          try {
            const r = await onVoiceParse(spoken); // 纠错 + 多图角色化
            finalText = mk(r.prompt);
            targetIndex = r.targetIndex;
            onChange(finalText); // 用整理后的版本替换
            // 多图：把"改第N张"的结果反馈给用户；否则清掉进行中提示
            if (typeof targetIndex === 'number') flashInfo(t('voice.targetSet', { n: targetIndex + 1 }));
            else setVoiceMsg(null);
          } catch (e) {
            setVoiceMsg(null); // 解析失败静默用原文
          } finally {
            setCorrecting(false);
          }
        }
        if (finalText.trim() && onVoiceSubmit) onVoiceSubmit(finalText, params, targetIndex);
      },
      onError: (code) => {
        setListening(false);
        const txt = voiceErrText(code);
        if (txt) setVoiceMsg({ text: txt, kind: 'err' });
      },
      onEnd: () => setListening(false),
    });
    recRef.current = rec;
    if (!rec) {
      setVoiceMsg({ text: t('voice.err.generic'), kind: 'err' });
      return;
    }
    rec.start();
    setListening(true);
  }
  const [showRecent, setShowRecent] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(loadPrompts()), []);
  // 移动端（触屏）回车=换行，桌面回车=生成
  const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  // ✨ 优化
  const [enhancing, setEnhancing] = useState(false);
  const [enhErr, setEnhErr] = useState('');
  const [prev, setPrev] = useState<string | null>(null);
  async function doEnhance() {
    if (!onEnhance || !value.trim() || enhancing) return;
    setEnhancing(true);
    setEnhErr('');
    try {
      const res = await onEnhance(value);
      setPrev(value);
      onChange(res);
    } catch (e) {
      setEnhErr(t('enh.fail', { m: (e as Error).message }));
    } finally {
      setEnhancing(false);
    }
  }

  const hasTag = (tag: StyleTag) => value.toLowerCase().includes(tag.append.toLowerCase());

  function toggleTag(tag: StyleTag) {
    if (hasTag(tag)) {
      const re = new RegExp(`\\s*,?\\s*${tag.append.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      onChange(value.replace(re, '').replace(/^\s*,\s*/, '').trim());
    } else {
      onChange(value.trim() ? `${value.trim()}, ${tag.append}` : tag.append);
    }
  }
  function shuffle() {
    onChange(shotPrompt(SHOWCASE[seed % SHOWCASE.length], lang));
    setSeed((s) => s + 1);
  }

  const selected = STYLE_TAGS.filter(hasTag);
  const visible = [...selected, ...STYLE_TAGS.filter((tg) => !hasTag(tg)).slice(0, 6)];

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl border border-line bg-panel p-[18px] transition focus-within:border-grass/45">
        {value && (
          <button
            onClick={() => {
              onChange('');
              document.getElementById('prompt-input')?.focus();
            }}
            aria-label={t('btn.clear')}
            title={t('btn.clear')}
            className="absolute right-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full text-mut transition hover:bg-panel2 hover:text-fg"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        )}
        <textarea
          id="prompt-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            // 中文输入法选词时的回车不触发
            if ((e.nativeEvent as any).isComposing) return;
            if (e.metaKey || e.ctrlKey) {
              e.preventDefault();
              onSubmit?.();
            } else if (!e.shiftKey && !isCoarse) {
              // 桌面：Enter 生成；Shift+Enter 换行
              e.preventDefault();
              onSubmit?.();
            }
          }}
          placeholder={placeholder ?? t('prompt.placeholder')}
          className="min-h-[88px] w-full resize-y bg-transparent pr-8 text-[15px] leading-relaxed text-fg outline-none placeholder:text-mut2"
        />
        {/* 输入框底部：只留字数 + 最近，不再拥挤 */}
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-line pt-2.5">
          <span className="text-[11px] text-mut2">
            {value.length} / 2000
            <span className="ml-2 hidden text-mut sm:inline">{isCoarse ? '' : 'Enter 生成 · Shift+Enter 换行'}</span>
          </span>
          <div className="flex items-center gap-3">
            {voiceOK && (
              <button
                onClick={toggleVoice}
                disabled={correcting}
                title={listening ? t('voice.stop') : t('voice.start')}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition ${
                  listening
                    ? 'animate-pulse border-red-500/50 bg-red-500/15 text-red-400'
                    : correcting
                      ? 'border-iris/40 bg-iris/10 text-iris'
                      : 'border-grass/40 bg-grass/10 text-grass hover:bg-grass/20'
                }`}
              >
                {correcting ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 10a2.5 2.5 0 0 0 2.5-2.5v-4a2.5 2.5 0 0 0-5 0v4A2.5 2.5 0 0 0 8 10Z" />
                    <path d="M12 7.5a.6.6 0 0 0-1.2 0 2.8 2.8 0 0 1-5.6 0 .6.6 0 0 0-1.2 0 4 4 0 0 0 3.4 3.95V13H6.5a.6.6 0 0 0 0 1.2h3a.6.6 0 0 0 0-1.2H8.6v-1.55A4 4 0 0 0 12 7.5Z" />
                  </svg>
                )}
                {correcting ? t('voice.correcting') : listening ? t('voice.listening') : t('voice.btn')}
              </button>
            )}
            {prev !== null && !enhancing && (
              <button onClick={() => { onChange(prev); setPrev(null); }} className="inline-flex items-center gap-1 text-[11px] text-mut hover:text-fg2">
                <IconUndo className="h-3 w-3" /> {t('enh.undo')}
              </button>
            )}
            {onEnhance && (
              <button
                onClick={doEnhance}
                disabled={enhancing || !value.trim()}
                className="flex items-center gap-1 rounded-full border border-iris/40 bg-iris/10 px-2.5 py-1 text-[11px] text-iris transition hover:bg-iris/20 disabled:opacity-40"
              >
                {enhancing ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('enh.doing')}
                  </>
                ) : (
                  <>
                    <IconSparkles className="h-3 w-3" /> {t('enh.btn')}
                  </>
                )}
              </button>
            )}
            {recent.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setRecent(loadPrompts());
                    setShowRecent((v) => !v);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-mut hover:text-fg2"
                >
                  <IconClock className="h-3 w-3" /> {t('prompt.recent')}
                </button>
                {showRecent && (
                  <div className="absolute bottom-full right-0 z-20 mb-1 max-h-56 w-64 overflow-auto rounded-lg border border-line bg-panel2 p-1 shadow-xl">
                    {recent.map((rp, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onChange(rp);
                          setShowRecent(false);
                        }}
                        className="block w-full truncate rounded px-2 py-1.5 text-left text-[12px] text-fg2 hover:bg-panel3"
                        title={rp}
                      >
                        {rp}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {enhErr && <p className="text-[12px] text-red-400">{enhErr}</p>}
      {voiceMsg && (
        <p className={`flex items-center gap-1.5 text-[12px] ${voiceMsg.kind === 'err' ? 'text-red-400' : 'text-mut'}`}>
          {voiceMsg.kind === 'info' && correcting && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {voiceMsg.text}
        </p>
      )}

      {/* 风格标签：独立一行，宽松不挤 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] text-mut">{selected.length ? t('prompt.selected') : t('prompt.style')}</span>
        {visible.map((tag) => (
          <button
            key={tag.label}
            onClick={() => toggleTag(tag)}
            className={`rounded-full px-2.5 py-1 text-[11px] transition ${
              hasTag(tag) ? 'border border-grass/30 bg-grass/10 text-grass' : 'chip'
            }`}
          >
            {tagLabel(tag, lang)}
          </button>
        ))}
      </div>

      {showExamples && !value.trim() && (
        <div>
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-xs font-medium text-fg2">{t('prompt.noIdea')}</span>
            <button onClick={shuffle} className="chip flex items-center gap-1.5 px-2.5 py-1 text-[11px]">
              <IconDice className="h-3 w-3" /> {t('prompt.shuffle')}
            </button>
          </div>
          <div className="scroll-x -mx-1 flex gap-2 px-1 pb-1">
            {SHOWCASE.map((s) => {
              const thumb = shotThumb(s);
              return (
                <button key={s.id} onClick={() => onChange(shotPrompt(s, lang))} className="w-[124px] flex-none text-left">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={shotTitle(s, lang)}
                      width={124}
                      height={74}
                      loading="lazy"
                      decoding="async"
                      className="h-[74px] w-[124px] rounded-[9px] border border-line object-cover"
                    />
                  ) : (
                    <div className="h-[74px] w-[124px] rounded-[9px] border border-line" style={{ background: s.gradient }} />
                  )}
                  <div className="mt-1.5 truncate text-[11px] text-fg2">{shotTitle(s, lang)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
