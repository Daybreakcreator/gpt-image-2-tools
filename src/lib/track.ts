// 匿名动作埋点：只把动作名 POST 给自家 Worker（/api/event），
// 服务端只累加一个整数计数，绝不携带 prompt / key / 图像。失败静默。
export type TrackEvent = 'generate' | 'edit' | 'inpaint' | 'enhance' | 'copy_prompt' | 'share_link' | 'voice';

export function track(name: TrackEvent): void {
  try {
    const body = JSON.stringify({ name });
    // 优先 sendBeacon：页面卸载也不丢，不阻塞主流程
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch('/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch (e) {
    /* 静默 */
  }
}
