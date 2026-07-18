import { getLang, setLang, useLang } from '@/lib/i18n';

export default function LangToggle() {
  const lang = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg2 transition hover:border-[#3a3a44] hover:text-fg"
      title="中 / EN"
    >
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  );
}

// 保证 SSR/首屏与 localStorage 一致（避免水合闪烁）
export { getLang };
