/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0d0d0f',
        panel: '#141418',
        panel2: '#1a1a20',
        panel3: '#1f1f26',
        line: '#26262d',
        linesoft: '#1c1c22',
        fg: '#f4f4f5',
        fg2: '#a1a1aa',
        mut: '#71717a',
        mut2: '#52525b',
        grass: '#22c55e',
        iris: '#a78bfa',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '0%': { backgroundPosition: '-480px 0' }, '100%': { backgroundPosition: '480px 0' } },
        caret: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        'glow-pulse': { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.45s cubic-bezier(0.2,0.7,0.2,1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'slide-down': 'slide-down 0.25s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        caret: 'caret 1.1s steps(1) infinite',
        'glow-pulse': 'glow-pulse 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
