# GPT-Image-2 Tools

> A free, privacy-first, multi-provider **AI image playground** — text-to-image, image-to-image, and inpainting in one box, with **voice control**. Your API key stays in your browser and never leaves your device.
>
> 免费、隐私优先、多端点兼容的 **AI 图像创作工具** —— 一个输入框搞定文生图 / 图生图 / 局部重绘，还能**说话即生成**。密钥只存浏览器，永不离开本机。

### 👉 Live demo / 在线体验：**https://image.markxian.cn**

[![demo](https://image.markxian.cn/showcase/peaks.jpg)](https://image.markxian.cn)

---

## ✨ Features

- **🎤 Voice control** — tap the mic and just talk; it transcribes, auto-corrects the text, then generates. With several images attached, say "edit the second one" to target a specific one. Free, browser-native, no extra key.
- **One multimodal input** — type to generate; drag / paste / drop an image to edit; brush a mask to inpaint. Up to 8 reference images, drag to reorder.
- **Works with any OpenAI-compatible endpoint** — `gpt-image`, `flux`, `dall-e`, and most proxy gateways. Bring your own key (BYOK).
- **Streaming, concurrent & cancelable** — watch images render; get all N at once even on endpoints that return one per call; stop anytime.
- **Iterate** — zoomable lightbox (scroll/click to zoom, drag to pan), before/after compare, reroll one, "continue from this", download all, copy prompt.
- **See what really happened** — a meta card shows requested vs **actual** size (flags endpoints that quietly change it) and the endpoint's rewritten prompt.
- **Inspiration library** — a themed prompt gallery (cinematic / scenery / illustration / product / food / architecture); one tap drops the prompt **plus its suggested size & quality**, or copy the prompt alone.
- **✨ AI prompt enhance** — rewrite a rough idea into a polished prompt (optional text endpoint).
- **Custom sizes** — visual ratio presets plus arbitrary W×H up to 4K, aligned to safe ranges.
- **History** — grouped by day, filter by type/time, search, restore a group, and multi-select batch delete/export. Stored locally (IndexedDB).
- **Searchable model picker** — pulls the live `/models` list, image-filtered, with a connection test.
- **i18n** — 中文 / English, instant switch.
- **100% client-side** — no backend, no key relay. Self-hostable static files.

## 🔒 Privacy

Your endpoint, key, model, history and settings live only in your browser (`localStorage` / IndexedDB). The app talks to **your** endpoint directly — there is no server in the middle that sees your key, prompts, or images.

## 🛠 Develop / Self-host

Built with **Astro + React islands + Tailwind**. This repo is the full source.

```bash
npm install
npm run dev      # local dev at http://localhost:4321
npm run build    # static output in dist/
```

`dist/` is a fully static app — drop it on Cloudflare Pages / Netlify / Vercel / GitHub Pages / nginx, or `npx serve dist`. Then open it, click **Settings**, and fill in your endpoint + key + model.

Optional: `worker/image-worker.js` + `wrangler.image.toml` show how the live site serves `dist/` from a Cloudflare Worker with an anonymous generation counter (a single integer in KV — it never sees prompts, keys, or images). Replace the route/KV ids with your own if you want the same setup.

Optional: `npm run gen:showcase` regenerates the homepage showcase images with your own key (`cp .env.example .env` first).

## 🐛 Found a bug? Want a feature?

Please open an **[Issue](../../issues)** — bug reports and ideas are very welcome. ⭐ Star the repo if it's useful!

## License

[MIT](LICENSE)
