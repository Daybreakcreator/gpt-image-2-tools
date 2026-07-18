import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site?.href.replace(/\/$/, '') ?? '';
  const items = [
    { title: '多模态图像创作', link: '/', desc: '一个输入框：文字生图，附图即编辑' },
    { title: '生成历史', link: '/gallery', desc: '本地保存的生成记录' },
  ];
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0"><channel>\n' +
    `  <title>GPT-Image-2 Tools</title>\n  <link>${base}</link>\n` +
    '  <description>BYOK 在线 AI 图像生成 Playground</description>\n' +
    items
      .map(
        (i) =>
          `  <item><title>${i.title}</title><link>${base}${i.link}</link><description>${i.desc}</description></item>`,
      )
      .join('\n') +
    '\n</channel></rss>';
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
