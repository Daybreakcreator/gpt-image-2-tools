// 最近用过的 Prompt（仅本地）。
const KEY = 'gpt-image-2:prompts';
const MAX = 12;

export function loadPrompts(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function pushPrompt(p: string) {
  const v = p.trim();
  if (!v) return;
  const list = [v, ...loadPrompts().filter((x) => x !== v)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}
