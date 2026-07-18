// BYOK 配置：只存浏览器 localStorage，永不发往任何后端。
export interface ApiConfig {
  baseUrl: string; // OpenAI 兼容图像端点，如 https://api.openai.com/v1
  apiKey: string;
  model: string;
  // ✨ AI 优化用的文本端点（chat/completions）。留空则回落到上面的图像端点/密钥。
  textBaseUrl?: string;
  textApiKey?: string;
  textModel?: string;
}

const KEY = 'gpt-image-2:config';

export const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-image-1',
  textBaseUrl: '',
  textApiKey: '',
  textModel: '',
};

// ✨ 优化用的文本端点（留空回落到图像端点）
export const textBase = (cfg: ApiConfig) => ((cfg.textBaseUrl || '').trim() || cfg.baseUrl).replace(/\/$/, '');
export const textKey = (cfg: ApiConfig) => (cfg.textApiKey || '').trim() || cfg.apiKey;

export function loadConfig(): ApiConfig {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(cfg: ApiConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function isConfigured(cfg: ApiConfig) {
  return Boolean(cfg.baseUrl && cfg.apiKey);
}

// 记住上次生成参数（不含 prompt）
const PKEY = 'gpt-image-2:params';
export function loadParams(): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(PKEY) ?? '{}');
  } catch {
    return {};
  }
}
export function saveParams(p: Record<string, unknown>) {
  try {
    localStorage.setItem(PKEY, JSON.stringify(p));
  } catch {
    /* quota */
  }
}

// 从 URL 一键填充配置，读取后立刻把参数从地址栏抹掉（避免密钥残留在历史/Referrer）。
// 支持：?baseUrl=&apiKey=&model=（别名 url/key/token）或 ?c=<base64(JSON)>
export function importFromUrl(): Partial<ApiConfig> | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const patch: Partial<ApiConfig> = {};

  const c = q.get('c');
  if (c) {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(c.replace(/-/g, '+').replace(/_/g, '/')))));
      if (o.baseUrl) patch.baseUrl = String(o.baseUrl);
      if (o.apiKey) patch.apiKey = String(o.apiKey);
      if (o.model) patch.model = String(o.model);
      if (o.textBaseUrl) patch.textBaseUrl = String(o.textBaseUrl);
      if (o.textApiKey) patch.textApiKey = String(o.textApiKey);
      if (o.textModel) patch.textModel = String(o.textModel);
    } catch {
      /* ignore */
    }
  }
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = q.get(k);
      if (v) return v;
    }
    return null;
  };
  const baseUrl = get('baseUrl', 'url', 'endpoint');
  const apiKey = get('apiKey', 'key', 'token');
  const model = get('model');
  if (baseUrl) patch.baseUrl = baseUrl;
  if (apiKey) patch.apiKey = apiKey;
  if (model) patch.model = model;

  if (!patch.baseUrl && !patch.apiKey && !patch.model) return null;

  // 清掉这些参数，保留其它
  ['c', 'baseUrl', 'url', 'endpoint', 'apiKey', 'key', 'token', 'model'].forEach((k) => q.delete(k));
  const qs = q.toString();
  window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  return patch;
}

// 生成一键配置链接（含密钥，仅私下使用）
export function buildConfigLink(cfg: ApiConfig): string {
  const json = JSON.stringify({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    ...(cfg.textBaseUrl ? { textBaseUrl: cfg.textBaseUrl } : {}),
    ...(cfg.textApiKey ? { textApiKey: cfg.textApiKey } : {}),
    ...(cfg.textModel ? { textModel: cfg.textModel } : {}),
  });
  const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${window.location.origin}/?c=${b64}`;
}
