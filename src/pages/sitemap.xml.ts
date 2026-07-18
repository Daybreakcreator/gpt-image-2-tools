import type { APIRoute } from 'astro';
import { LANDINGS } from '../lib/landing';

export const GET: APIRoute = ({ site }) => {
  const base = site?.href.replace(/\/$/, '') ?? '';
  const paths = ['/', '/gallery', ...LANDINGS.map((l) => `/${l.slug}`)];
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n') +
    '\n</urlset>';
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
