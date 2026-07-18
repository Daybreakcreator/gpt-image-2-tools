import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { IconCheck } from './icons';

// 托管模式「假门」需求验证：点一下 = 匿名 +1（/api/metric，每浏览器只投一次），
// 只发里程碑名，绝不含 prompt/key/图像/任何 PII。红线不动。纯冒烟测试，无后端、无收费。
const KEY = 'hosted_interest_voted';

export default function HostedUpsell() {
  const t = useT();
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    try {
      setVoted(localStorage.getItem(KEY) === '1');
    } catch (e) {
      /* 忽略 */
    }
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        const n = d?.metrics?.hosted_interest;
        if (typeof n === 'number') setCount(n);
      })
      .catch(() => {});
  }, []);

  function vote() {
    if (voted) return;
    setVoted(true);
    setCount((c) => (c === null ? 1 : c + 1));
    try {
      localStorage.setItem(KEY, '1');
    } catch (e) {
      /* 忽略 */
    }
    try {
      const body = JSON.stringify({ name: 'hosted_interest' });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/metric', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/metric', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
    } catch (e) {
      /* 静默 */
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-line bg-panel2/40 p-3">
      <p className="text-[12px] leading-relaxed text-fg2">{t('hosted.desc')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        {voted ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-grass">
            <IconCheck className="h-3.5 w-3.5" /> {t('hosted.voted')}
          </span>
        ) : (
          <button
            onClick={vote}
            className="rounded-lg border border-grass/40 bg-grass/10 px-2.5 py-1 text-[12px] text-grass transition hover:bg-grass/20"
          >
            {t('hosted.cta')}
          </button>
        )}
        {count !== null && count > 0 && <span className="text-[11px] text-mut">{t('hosted.count', { n: count })}</span>}
      </div>
      <p className="mt-1.5 text-[11px] text-mut2">{t('hosted.soon')}</p>
    </div>
  );
}
