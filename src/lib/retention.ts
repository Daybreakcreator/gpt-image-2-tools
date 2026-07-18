// 匿名留存埋点：所有明细（首次/最近生成日、批次数、是否激活）只存本机 localStorage，
// 只在「里程碑首次达成」时向自家 Worker（/api/metric）发一次匿名 +1，服务端仅累加整数。
// 绝不携带 prompt / key / 图像 / 明文时间戳。与 track.ts 同范式，失败静默。
//
// 三个里程碑（每个浏览器最多各上报一次，因此聚合值可直接算比率）：
//   first_gen  —— 首次成功生成（留存/激活率的分母）
//   activated  —— 首次达成「改到第 2 版」（已生成过后又对图做编辑/局部重绘 = must-have 时刻）
//   returned   —— 首次「隔天回访再生成」（今天晚于首次生成日）
export type Metric = 'first_gen' | 'activated' | 'returned';

const KEY = 'retention.v1';
const METRICS: readonly Metric[] = ['first_gen', 'activated', 'returned'];

type State = {
  firstDay: number; // 首次生成的 epoch-day
  lastDay: number; // 最近生成的 epoch-day
  gens: number; // 成功生成批次数
  activated: boolean; // 是否已达成「改到第 2 版」
  reported: Partial<Record<Metric, 1>>; // 已上报的里程碑，防重复上报
};

const epochDay = (): number => Math.floor(Date.now() / 86_400_000);

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<State>;
      return {
        firstDay: Number(s.firstDay) || 0,
        lastDay: Number(s.lastDay) || 0,
        gens: Number(s.gens) || 0,
        activated: !!s.activated,
        reported: s.reported && typeof s.reported === 'object' ? s.reported : {},
      };
    }
  } catch (e) {
    /* 忽略：本地数据损坏时按新用户处理 */
  }
  return { firstDay: 0, lastDay: 0, gens: 0, activated: false, reported: {} };
}

function save(s: State): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    /* 静默：隐私/存储受限时不影响生成 */
  }
}

// 向 /api/metric 发一次匿名 +1（只传里程碑名）。优先 sendBeacon，失败静默。
function sendMetric(name: Metric): void {
  try {
    const body = JSON.stringify({ name });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/metric', new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch('/api/metric', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch (e) {
    /* 静默 */
  }
}

// 每次成功生成后调用。isIterate: 本次是否为对已有图的编辑/局部重绘。
export function recordGeneration({ isIterate }: { isIterate: boolean }): void {
  if (typeof window === 'undefined') return;
  const s = load();
  const today = epochDay();
  const isFirst = s.gens === 0;

  const report = (name: Metric): void => {
    if (s.reported[name] || !METRICS.includes(name)) return;
    s.reported[name] = 1;
    sendMetric(name);
  };

  s.gens += 1;
  if (isFirst) {
    s.firstDay = today;
    report('first_gen');
  } else if (today > s.firstDay) {
    // 已生成过、且是首次生成之后的某一天再来生成 → 隔天回访
    report('returned');
  }
  // 「改到第 2 版」：已生成过（非首次动作）后又对图做编辑/局部重绘
  if (isIterate && !isFirst && !s.activated) {
    s.activated = true;
    report('activated');
  }

  s.lastDay = today;
  save(s);
}
