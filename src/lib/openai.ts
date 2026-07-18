// OpenAI 兼容图像 API 客户端（浏览器直连，BYOK）。
import { textBase, textKey, type ApiConfig } from './config';

// 命名预设 + 任意自定义 'WxH'（兼容端点/其它模型）。(string & {}) 既放宽又保留预设自动补全。
export type Size = '1024x1024' | '1536x1024' | '1024x1536' | 'auto' | (string & {});
export type Quality = 'auto' | 'low' | 'medium' | 'high';
export type OutputFormat = 'png' | 'jpeg' | 'webp';
export type Background = 'auto' | 'transparent' | 'opaque';

export interface GenerateParams {
  prompt: string;
  size: Size;
  quality: Quality;
  n: number;
  output_format: OutputFormat;
  background: Background;
}

export interface ResultImage {
  // 统一成可直接用的 data URL 或远程 url
  src: string;
  format: OutputFormat;
  revised?: string; // 端点改写后的 prompt（若返回 revised_prompt）
}

function endpoint(cfg: ApiConfig, path: string) {
  return `${cfg.baseUrl.replace(/\/$/, '')}${path}`;
}

async function parseError(res: Response): Promise<never> {
  let msg = `${res.status} ${res.statusText}`;
  try {
    const j = await res.json();
    msg = j?.error?.message ?? JSON.stringify(j);
  } catch {
    /* keep status */
  }
  throw new Error(msg);
}

function toImages(json: any, format: OutputFormat): ResultImage[] {
  const data = json?.data ?? [];
  return data.map((d: any) => ({
    src: d.b64_json ? `data:image/${format};base64,${d.b64_json}` : d.url,
    format,
    revised: typeof d.revised_prompt === 'string' ? d.revised_prompt : undefined,
  }));
}

// 文生图
export async function generateImages(cfg: ApiConfig, p: GenerateParams, signal?: AbortSignal): Promise<ResultImage[]> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    prompt: p.prompt,
    n: p.n,
    size: p.size,
    quality: p.quality,
    output_format: p.output_format,
  };
  if (p.background !== 'auto') body.background = p.background;

  const res = await fetch(endpoint(cfg, '/images/generations'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) await parseError(res);
  return toImages(await res.json(), p.output_format);
}

// ✨ AI 优化：用 chat/completions 把粗略想法改写成高质量图像提示词。
// 需端点支持文本模型；不支持时抛错由调用方提示。
export async function enhancePrompt(cfg: ApiConfig, prompt: string, lang: 'zh' | 'en'): Promise<string> {
  const base = textBase(cfg);
  const apiKey = textKey(cfg);
  if (!base || !apiKey) throw new Error(lang === 'en' ? 'Set your endpoint and key first' : '请先在设置里填好地址和密钥');
  const model = (cfg.textModel || '').trim() || 'gpt-4o-mini';
  const sys =
    lang === 'en'
      ? "You are a prompt engineer for text-to-image models. Rewrite the user's idea into ONE vivid, detailed English image prompt covering subject, style, lighting, composition, mood and quality. Keep their intent. Output ONLY the prompt text — no quotes, no explanation."
      : '你是文生图提示词专家。把用户的想法改写成一条生动、细节丰富的中文图像提示词，覆盖主体、风格、光影、构图、氛围、画质。保留原意。只输出提示词本身，不要引号、不要解释。';
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
      }),
      signal: ac.signal,
    });
    if (!res.ok) await parseError(res);
    const j = await res.json();
    const text: string = j?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) throw new Error(lang === 'en' ? 'empty response' : '返回为空');
    return text.replace(/^["'“”]+|["'“”]+$/g, '').trim();
  } finally {
    clearTimeout(timer);
  }
}

// 🎤 语音意图解析：把语音转写整理成清晰的图像指令（纠错 + 角色化）。
// - 单图/无图：等价于纠错（修同音字、补标点、去口头语，不扩写）。
// - 多图：把"图1/第二张/the first one"解析成角色，prompt 里写清哪张是底图、哪些是参考；
//   若用户指明要改第几张，返回 targetIndex（0 基）。
// 文本端点未配置或失败时静默返回原文（best-effort，不打断生成）。
export async function parseVoiceIntent(
  cfg: ApiConfig,
  transcript: string,
  ctx: { imageCount: number },
  lang: 'zh' | 'en',
): Promise<{ prompt: string; targetIndex?: number }> {
  const base = textBase(cfg);
  const apiKey = textKey(cfg);
  if (!base || !apiKey || !transcript.trim()) return { prompt: transcript };
  const model = (cfg.textModel || '').trim() || 'gpt-4o-mini';
  const n = ctx.imageCount;
  const multi = n >= 2;
  const sys =
    lang === 'en'
      ? `You turn a raw speech-to-text transcript into a clean image instruction.${
          multi
            ? ` ${n} images are attached, numbered 1..${n} in their current order. The user may reference them ("image 1", "the second one"). In the prompt, make roles explicit: which image is the BASE being edited and which are REFERENCES. If the user says which image to edit, set targetIndex to its 1-based number.`
            : ''
        } Fix recognition errors and punctuation, keep the user's intent, do NOT embellish. Respond with ONLY a JSON object: {"prompt": string${multi ? ', "targetIndex": number|null' : ''}}.`
      : `你把语音识别的原始文本整理成清晰的图像指令。${
          multi
            ? `当前附了 ${n} 张图，按当前顺序编号 1..${n}。用户可能用"图1""第二张"指代它们。请在 prompt 里把角色写清楚：哪张是被修改的底图(BASE)、哪些是参考图(REFERENCE)。若用户指明要改第几张，把它的序号（从 1 开始）填到 targetIndex。`
            : ''
        }修正识别错误与标点，保持原意、不要扩写。只输出一个 JSON 对象：{"prompt": string${multi ? ', "targetIndex": number|null' : ''}}。`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: transcript },
        ],
        temperature: 0.2,
      }),
      signal: ac.signal,
    });
    if (!res.ok) return { prompt: transcript };
    const j = await res.json();
    const raw: string = j?.choices?.[0]?.message?.content ?? '';
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const o = JSON.parse(m[0]);
        const prompt = typeof o.prompt === 'string' && o.prompt.trim() ? o.prompt.trim() : transcript;
        let targetIndex: number | undefined;
        if (multi && Number.isFinite(o.targetIndex)) {
          const ti = Math.round(o.targetIndex);
          if (ti >= 1 && ti <= n) targetIndex = ti - 1; // 转 0 基
        }
        return { prompt: prompt.replace(/^["'“”]+|["'“”]+$/g, '').trim(), targetIndex };
      } catch (e) {
        /* 非合法 JSON，落到下面当纯文本 */
      }
    }
    return { prompt: raw.trim() || transcript };
  } catch (e) {
    return { prompt: transcript };
  } finally {
    clearTimeout(timer);
  }
}

// 拉取端点可用模型列表（/models）。失败抛错由调用方降级到手输。
export async function listModels(cfg: ApiConfig): Promise<string[]> {
  if (!cfg.baseUrl || !cfg.apiKey) throw new Error('not configured');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);
  try {
    const res = await fetch(endpoint(cfg, '/models'), { headers: { authorization: `Bearer ${cfg.apiKey}` }, signal: ac.signal });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    const list: any[] = j?.data ?? j?.models ?? (Array.isArray(j) ? j : []);
    return [...new Set(list.map((m) => m?.id ?? m?.name ?? m).filter((x) => typeof x === 'string'))] as string[];
  } finally {
    clearTimeout(timer);
  }
}

// 测试连接：用免费的 /models 探活（不产生生成费用），返回逐项校验清单。
export type StepState = 'ok' | 'warn' | 'fail';
export type TestStep = { key: 'step.reachable' | 'step.keyValid' | 'step.modelAvail'; state: StepState; note?: string };
export type TestResult = { level: 'ok' | 'warn' | 'error'; steps: TestStep[]; ms?: number };

const maskKey = (k: string) => (k.length > 6 ? `sk-…${k.slice(-4)}` : '••••');

export async function testConnection(cfg: ApiConfig): Promise<TestResult> {
  if (!cfg.baseUrl || !cfg.apiKey) return { level: 'error', steps: [{ key: 'step.reachable', state: 'fail', note: 'needFill' }] };
  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);
  try {
    const res = await fetch(endpoint(cfg, '/models'), { headers: { authorization: `Bearer ${cfg.apiKey}` }, signal: ac.signal });
    const ms = Date.now() - t0;
    let host = cfg.baseUrl;
    try {
      host = new URL(cfg.baseUrl).host;
    } catch {
      /* keep */
    }
    const reachable: TestStep = { key: 'step.reachable', state: 'ok', note: `${host} · ${ms}ms` };
    const auth = res.status === 401 || res.status === 403;
    const keyValid: TestStep = { key: 'step.keyValid', state: auth ? 'fail' : 'ok', note: maskKey(cfg.apiKey) };

    let modelAvail: TestStep;
    if (auth) modelAvail = { key: 'step.modelAvail', state: 'warn', note: cfg.model };
    else if (!res.ok) modelAvail = { key: 'step.modelAvail', state: 'warn', note: `${cfg.model} · /models ${res.status}` };
    else {
      const j = await res.json().catch(() => null);
      const list: any[] = j?.data ?? j?.models ?? (Array.isArray(j) ? j : []);
      const ids = list.map((m) => m?.id ?? m?.name ?? m).filter((x) => typeof x === 'string');
      modelAvail = { key: 'step.modelAvail', state: ids.length === 0 || ids.includes(cfg.model) ? 'ok' : 'warn', note: cfg.model };
    }
    const steps = [reachable, keyValid, modelAvail];
    const level = steps.some((s) => s.state === 'fail') ? 'error' : steps.some((s) => s.state === 'warn') ? 'warn' : 'ok';
    return { level, steps, ms };
  } catch (e) {
    return { level: 'error', steps: [{ key: 'step.reachable', state: 'fail', note: (e as Error).name === 'AbortError' ? 'timeout' : 'unreachable' }] };
  } finally {
    clearTimeout(timer);
  }
}

// 流式文生图：边渲染边返回 partial 预览。端点不支持时抛错，由调用方回落到非流式。
// onUpdate(images, done) 在每次 partial / 完成时回调。
export async function generateImagesStream(
  cfg: ApiConfig,
  p: GenerateParams,
  onUpdate: (images: ResultImage[], done: boolean) => void,
  signal?: AbortSignal,
): Promise<ResultImage[]> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    prompt: p.prompt,
    n: 1,
    size: p.size,
    quality: p.quality,
    output_format: p.output_format,
    stream: true,
    partial_images: 2,
  };
  if (p.background !== 'auto') body.background = p.background;

  const res = await fetch(endpoint(cfg, '/images/generations'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) await parseError(res);

  const ct = res.headers.get('content-type') ?? '';
  // 端点忽略了 stream（返回普通 JSON）→ 当作非流式，直接出最终图
  if (!ct.includes('text/event-stream') || !res.body) {
    const imgs = toImages(await res.json(), p.output_format);
    onUpdate(imgs, true);
    return imgs;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let final: ResultImage[] = [];
  const toImg = (b64: string): ResultImage => ({ src: `data:image/${p.output_format};base64,${b64}`, format: p.output_format });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split('\n\n');
    buf = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const data = dataLine.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      let ev: any;
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      const b64 = ev.b64_json ?? ev.data?.[0]?.b64_json;
      if (!b64) continue;
      const img = toImg(b64);
      const revised = ev.revised_prompt ?? ev.data?.[0]?.revised_prompt;
      if (typeof revised === 'string') img.revised = revised;
      const done2 = typeof ev.type === 'string' && /completed|done/.test(ev.type);
      if (done2) {
        final = [img];
        onUpdate(final, true);
      } else {
        onUpdate([img], false);
      }
    }
  }
  return final;
}

// 把结果图（data URL 或远程 URL）转成 File，用于「以此继续编辑」
export async function srcToFile(src: string, name: string): Promise<File> {
  const res = await fetch(src); // data: URL 原生支持；同源/blob 亦可
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/png' });
}

// 图生图 / 编辑（multipart）
export async function editImages(
  cfg: ApiConfig,
  p: GenerateParams,
  images: File[],
  mask?: File,
  signal?: AbortSignal,
): Promise<ResultImage[]> {
  const fd = new FormData();
  fd.set('model', cfg.model);
  fd.set('prompt', p.prompt);
  fd.set('n', String(p.n));
  fd.set('size', p.size);
  fd.set('quality', p.quality);
  for (const img of images) fd.append('image[]', img);
  if (mask) fd.set('mask', mask);

  const res = await fetch(endpoint(cfg, '/images/edits'), {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.apiKey}` },
    body: fd,
    signal,
  });
  if (!res.ok) await parseError(res);
  return toImages(await res.json(), p.output_format);
}
