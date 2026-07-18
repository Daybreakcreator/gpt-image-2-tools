// 语音控制：浏览器原生 Web Speech API（免费、不要 key）+ 轻量离线指令解析。
// 解析把"两张 / 横版 / 高清"这类口令转成参数，其余作为 prompt——用户不碰任何控件。
import type { GenerateParams, Quality } from './openai';

export type VoiceParams = Partial<Pick<GenerateParams, 'n' | 'size' | 'quality'>>;

// 浏览器是否支持语音识别（Chrome/Edge/Safari 支持，Firefox 不支持）
export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

// 创建一个识别器（内部封装 webkit 前缀差异）。回调驱动 React 状态。
export function createRecognizer(opts: {
  lang: 'zh' | 'en';
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (e: string) => void;
  onEnd?: () => void;
}): { start: () => void; stop: () => void } | null {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = opts.lang === 'zh' ? 'zh-CN' : 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onresult = (ev: any) => {
    let interim = '';
    let final = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim && opts.onInterim) opts.onInterim(interim);
    if (final) opts.onFinal(final.trim());
  };
  rec.onerror = (ev: any) => opts.onError?.(ev.error || 'voice_error');
  rec.onend = () => opts.onEnd?.();

  return {
    start: () => {
      try {
        rec.start();
      } catch (e) {
        /* 重复 start 会抛错，忽略 */
      }
    },
    stop: () => {
      try {
        rec.stop();
      } catch (e) {
        /* ignore */
      }
    },
  };
}

// 离线口令解析：从转写里抠出 张数 / 方向 / 质量，并把命中的口令词从 prompt 里剔除。
// 只匹配非常明确的词，匹配不到就原样作为 prompt——保守优先，避免误伤描述。
export function parseVoiceCommand(raw: string, lang: 'zh' | 'en'): { prompt: string; params: VoiceParams } {
  let text = raw;
  const params: VoiceParams = {};
  const strip = (re: RegExp) => {
    text = text.replace(re, ' ');
  };

  // —— 张数 ——
  const cnZap: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8 };
  let m = text.match(/(?:来|生成|出|画)?\s*([一二两三四五六七八]|[1-8])\s*张/);
  if (m) {
    const v = cnZap[m[1]] ?? Number(m[1]);
    if (v >= 1 && v <= 8) params.n = v;
    strip(/(?:来|生成|出|画)?\s*(?:[一二两三四五六七八]|[1-8])\s*张/);
  } else {
    m = text.match(/\b([1-8])\s*(?:images?|pics?|pictures?)\b/i) || text.match(/\b(one|two|three|four|five|six|seven|eight)\s+(?:images?|pics?|pictures?)\b/i);
    if (m) {
      const enZap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
      const v = enZap[m[1].toLowerCase()] ?? Number(m[1]);
      if (v >= 1 && v <= 8) params.n = v;
      strip(/\b(?:[1-8]|one|two|three|four|five|six|seven|eight)\s+(?:images?|pics?|pictures?)\b/i);
    }
  }

  // —— 方向 / 尺寸 ——
  if (/横版|横图|横屏|宽图|宽屏|landscape|wide/i.test(text)) {
    params.size = '1536x1024';
    strip(/横版|横图|横屏|宽图|宽屏|landscape|wide/gi);
  } else if (/竖版|竖图|竖屏|长图|portrait|tall|vertical/i.test(text)) {
    params.size = '1024x1536';
    strip(/竖版|竖图|竖屏|长图|portrait|tall|vertical/gi);
  } else if (/方形|正方形|方图|square/i.test(text)) {
    params.size = '1024x1024';
    strip(/方形|正方形|方图|square/gi);
  }

  // —— 质量 ——
  if (/高清|高质量|精细|超清|high\s*quality|hd|high\s*res/i.test(text)) {
    params.quality = 'high' as Quality;
    strip(/高清|高质量|精细|超清|high\s*quality|hd|high\s*res/gi);
  } else if (/草图|快速|低质量|draft|fast|quick|low\s*quality/i.test(text)) {
    params.quality = 'low' as Quality;
    strip(/草图|快速|低质量|draft|fast|quick|low\s*quality/gi);
  }

  // 清理多余标点/空格
  const prompt = text
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,，。、]+|[\s,，。、]+$/g, '')
    .trim();

  return { prompt, params };
}
