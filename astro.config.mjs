import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://image.markxian.cn',
  integrations: [react(), tailwind()],
  // 多模态合并后，旧的图生图页重定向到统一入口
  redirects: { '/edits': '/' },
});
