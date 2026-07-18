import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';

// 低于阈值不显示，避免「只有几张」的尴尬。
const THRESHOLD = 100;

export default function UsageStat() {
  const t = useT();
  const [count, setCount] = useState<number | null>(null);
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>();

  // 拉取 + 轻量轮询（仅页面可见时），让别人生成也会跳
  useEffect(() => {
    const load = () =>
      fetch('/api/stats')
        .then((r) => r.json())
        .then((d) => typeof d.images === 'number' && setCount(d.images))
        .catch(() => {});
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 20000);
    const onCounted = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n === 'number') setCount(n);
    };
    window.addEventListener('gen-counted', onCounted);
    return () => {
      clearInterval(timer);
      window.removeEventListener('gen-counted', onCounted);
    };
  }, []);

  // 数字滚动（ease-out）
  useEffect(() => {
    if (count === null) return;
    const from = display;
    const to = count;
    if (from === to) return;
    const startTime = performance.now();
    const dur = 900;
    const step = (now: number) => {
      const p = Math.min(1, (now - startTime) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [count]);

  if (count === null || count < THRESHOLD) return null;

  const [pre, post] = t('stats.generated').split('{n}'); // 模板按 {n} 切前后两段
  return (
    <div className="mt-10 flex items-center justify-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-sm text-fg2">
        <span className="inline-flex h-2 w-2 rounded-full bg-grass" />
        <span>
          {pre}
          <span className="font-mono font-semibold text-fg tabular-nums">{display.toLocaleString()}</span>
          {post}
        </span>
      </div>
    </div>
  );
}
