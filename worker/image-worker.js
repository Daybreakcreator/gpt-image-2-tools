// image.markxian.cn 的资源 Worker + 匿名计数。
// /api/stats        GET  -> { images: 累计生成张数, events: { <name>: 次数 } }
// /api/gen          POST { n } -> 累加 images 并返回 { images }
// /api/event        POST { name } -> 按动作名累加并返回 { ok, name, count }
// 其余路径          -> 直接服务 dist 静态资源（env.ASSETS）
// 只存匿名整数计数，绝不接触 prompt / key / 图像。
const EVENTS = ['generate', 'edit', 'inpaint', 'enhance', 'copy_prompt', 'share_link', 'voice'];
// 留存里程碑（每个浏览器最多各上报一次，聚合值可直接算激活率/回访率）
const METRICS = ['first_gen', 'activated', 'returned', 'hosted_interest'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const json = (data) =>
      new Response(JSON.stringify(data), {
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' },
      });

    if (url.pathname === '/api/stats') {
      const images = Number((await env.COUNTER.get('images')) ?? '0');
      const events = {};
      await Promise.all(
        EVENTS.map(async (name) => {
          events[name] = Number((await env.COUNTER.get(`evt:${name}`)) ?? '0');
        })
      );
      const metrics = {};
      await Promise.all(
        METRICS.map(async (name) => {
          metrics[name] = Number((await env.COUNTER.get(`mtr:${name}`)) ?? '0');
        })
      );
      return json({ images, events, metrics });
    }

    if (url.pathname === '/api/gen' && request.method === 'POST') {
      let inc = 1;
      try {
        const b = await request.json();
        inc = Math.max(0, Math.min(8, Number(b.n) || 1));
      } catch (e) {
        /* default 1 */
      }
      const cur = Number((await env.COUNTER.get('images')) ?? '0') + inc;
      await env.COUNTER.put('images', String(cur));
      return json({ images: cur });
    }

    if (url.pathname === '/api/event' && request.method === 'POST') {
      let name = '';
      try {
        name = String((await request.json()).name || '');
      } catch (e) {
        /* ignore */
      }
      if (!EVENTS.includes(name)) return json({ ok: false });
      const key = `evt:${name}`;
      const cur = Number((await env.COUNTER.get(key)) ?? '0') + 1;
      await env.COUNTER.put(key, String(cur));
      return json({ ok: true, name, count: cur });
    }

    if (url.pathname === '/api/metric' && request.method === 'POST') {
      let name = '';
      try {
        name = String((await request.json()).name || '');
      } catch (e) {
        /* ignore */
      }
      if (!METRICS.includes(name)) return json({ ok: false });
      const key = `mtr:${name}`;
      const cur = Number((await env.COUNTER.get(key)) ?? '0') + 1;
      await env.COUNTER.put(key, String(cur));
      return json({ ok: true, name, count: cur });
    }

    return env.ASSETS.fetch(request);
  },
};
