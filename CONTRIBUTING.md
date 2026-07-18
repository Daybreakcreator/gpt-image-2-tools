# Contributing / 贡献指南

Thanks for your interest! Bug reports, feature ideas and PRs are all welcome.
感谢关注！欢迎提 bug、想法和 PR。

## Dev setup

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # verify it builds before opening a PR
```

Stack: Astro + React islands + Tailwind. UI strings live in `src/lib/i18n.ts` — **add both 中文 and English** for any new user-facing text.

## The one hard rule: privacy / 隐私红线

This is a **BYOK, 100% client-side** app. Any PR that breaks the following will be rejected, no matter how useful the feature is:

1. The user's API key, prompts and images may only be sent to **the endpoint the user configured** — never to any other server (including this site's own `/api`).
2. Settings / history live only in `localStorage` / IndexedDB.
3. No new telemetry, analytics SDKs or external scripts.
4. The Cloudflare Worker (`worker/`) only serves static assets and keeps an anonymous counter — a single integer in KV. It must never touch prompts, keys or images.

任何让 key / prompt / 图像离开浏览器（除用户自己配置的端点外）的改动都不会被合并。

## PR flow

1. Fork → branch → make your change → `npm run build` passes.
2. Open a PR with a short description of *what* and *why*.
3. [CodeRabbit](https://coderabbit.ai) will auto-review (in Chinese) — please address or discuss its comments; a maintainer reviews after that.

Small, focused PRs get merged fastest. For big changes, open an issue first to discuss.
