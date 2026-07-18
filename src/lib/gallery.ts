// 最近生成记录（仅本地）。base64 较占空间，限量并对配额做降级。
export interface GalleryItem {
  src: string;
  prompt: string;
  at: number;
}

const KEY = 'gpt-image-2:gallery';
const MAX = 12;

export function loadGallery(): GalleryItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function pushGallery(items: GalleryItem[]) {
  if (typeof localStorage === 'undefined') return;
  let list = [...items, ...loadGallery()].slice(0, MAX);
  // 配额不足时逐步丢弃最旧的
  while (list.length) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return;
    } catch {
      list = list.slice(0, list.length - 1);
    }
  }
}

export function clearGallery() {
  localStorage.removeItem(KEY);
}
