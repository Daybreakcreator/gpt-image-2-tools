// 生成「组」历史：每次生成 = 一组。用 IndexedDB 存（容量大），带缓存上限策略。仅本地。
export type GenType = 't2i' | 'edit' | 'inpaint';

export interface GenGroup {
  id: string;
  type: GenType;
  prompt: string;
  size: string;
  quality: string;
  model: string;
  n: number;
  durationMs: number;
  at: number;
  images: string[]; // data URL
}

const DB = 'gpt-image-2';
const STORE = 'groups';
const VER = 1;

// 缓存上限策略：组数 + 总字节双重封顶，超了删最旧
const MAX_GROUPS = 200;
const MAX_BYTES = 180 * 1024 * 1024; // ~180MB

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const store = (db: IDBDatabase, mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);
const wrap = <T>(r: IDBRequest<T>): Promise<T> => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const bytesOf = (g: GenGroup) => g.images.reduce((s, x) => s + x.length, 0);

export async function loadGroups(): Promise<GenGroup[]> {
  try {
    const db = await openDB();
    const all = await wrap<GenGroup[]>(store(db, 'readonly').getAll());
    return all.sort((a, b) => b.at - a.at); // 新 -> 旧
  } catch {
    return [];
  }
}

export async function pushGroup(g: GenGroup) {
  try {
    const db = await openDB();
    await wrap(store(db, 'readwrite').put(g));
    // 应用上限：从最旧开始删，直到组数 & 字节都达标
    const all = await loadGroups();
    let count = all.length;
    let total = all.reduce((s, x) => s + bytesOf(x), 0);
    const del: string[] = [];
    for (let i = all.length - 1; i >= 0 && (count > MAX_GROUPS || total > MAX_BYTES); i--) {
      del.push(all[i].id);
      total -= bytesOf(all[i]);
      count--;
    }
    if (del.length) {
      const st = store(db, 'readwrite');
      del.forEach((id) => st.delete(id));
    }
  } catch {
    /* ignore */
  }
}

export async function deleteGroup(id: string) {
  try {
    const db = await openDB();
    await wrap(store(db, 'readwrite').delete(id));
  } catch {
    /* ignore */
  }
}

export async function deleteGroups(ids: string[]) {
  if (!ids.length) return;
  try {
    const db = await openDB();
    const st = store(db, 'readwrite');
    await Promise.all(ids.map((id) => wrap(st.delete(id))));
  } catch {
    /* ignore */
  }
}

export async function clearGroups() {
  try {
    const db = await openDB();
    await wrap(store(db, 'readwrite').clear());
  } catch {
    /* ignore */
  }
}

export async function storageInfo(): Promise<{ groups: number; images: number; mb: number }> {
  const all = await loadGroups();
  const bytes = all.reduce((s, g) => s + bytesOf(g), 0);
  return { groups: all.length, images: all.reduce((s, g) => s + g.images.length, 0), mb: Math.round((bytes / 1048576) * 10) / 10 };
}

// 日期分组标签
export function dayLabel(at: number, lang: 'zh' | 'en'): string {
  const d = new Date(at);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
  if (diff === 0) return lang === 'en' ? 'Today' : '今天';
  if (diff === 1) return lang === 'en' ? 'Yesterday' : '昨天';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function hhmm(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
