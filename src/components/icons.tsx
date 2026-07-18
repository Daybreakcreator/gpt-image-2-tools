// 统一线性描边图标：viewBox 24、stroke=currentColor（跟随按钮文字色）、圆角端点。
// 用来替换当作功能按钮用的 emoji（kill-ai-slop tell 12/21）。size 用 className 控制，默认 h-4 w-4。
import type { ReactNode } from 'react';

type P = { className?: string };

function Svg({ className = 'h-4 w-4', children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

const dot = (cx: number, cy: number) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.1} fill="currentColor" stroke="none" />;

export const IconSparkles = (p: P) => (
  <Svg {...p}>
    <path d="M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5z" />
    <path d="M18.5 4l.6 1.8 1.9.7-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.7z" />
  </Svg>
);

export const IconDice = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3.2" />
    {dot(8.5, 8.5)}
    {dot(15.5, 8.5)}
    {dot(12, 12)}
    {dot(8.5, 15.5)}
    {dot(15.5, 15.5)}
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9.5V13l2.5 2M9.5 3h5" />
  </Svg>
);

export const IconPencil = (p: P) => (
  <Svg {...p}>
    <path d="M4 20l4.5-1L19 8.5a1.6 1.6 0 000-2.3l-1.2-1.2a1.6 1.6 0 00-2.3 0L5 15.5 4 20z" />
    <path d="M14 6.5l3.5 3.5" />
  </Svg>
);

export const IconActivity = (p: P) => (
  <Svg {...p}>
    <path d="M3 12h4l2.5 6 4-13 2.5 7H21" />
  </Svg>
);

export const IconLink = (p: P) => (
  <Svg {...p}>
    <path d="M9.5 14.5l5-5M10.5 6.5l1-1a3.8 3.8 0 015.5 5.3l-1 1M13.5 17.5l-1 1a3.8 3.8 0 01-5.5-5.3l1-1" />
  </Svg>
);

export const IconMic = (p: P) => (
  <Svg {...p}>
    <rect x="9.5" y="3" width="5" height="10.5" rx="2.5" />
    <path d="M6.5 11a5.5 5.5 0 0011 0M12 16.5V21M9 21h6" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Svg>
);

export const IconCheckSquare = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M8 12.5l2.8 2.8L16 9" />
  </Svg>
);

export const IconBrush = (p: P) => (
  <Svg {...p}>
    <path d="M17 3.5l3.5 3.5-8 8-3.5-.5-.5-3.5 8-7.5z" />
    <path d="M8.5 14.5C6.5 15.5 6 18 3.5 18.5c1 2 3.5 2.8 5.3 1.6 1.4-1 1.6-3 0-4.6z" />
  </Svg>
);

export const IconEraser = (p: P) => (
  <Svg {...p}>
    <path d="M8 20H4.5l-.5-.5a2 2 0 010-2.8l9.5-9.5a2 2 0 012.8 0l3 3a2 2 0 010 2.8L14 20H8z" />
    <path d="M10 10.5l5.5 5.5" />
  </Svg>
);

export const IconUndo = (p: P) => (
  <Svg {...p}>
    <path d="M9 14L4 9l5-5M4 9h10a6 6 0 016 6v0a6 6 0 01-6 6H8" />
  </Svg>
);

export const IconBulb = (p: P) => (
  <Svg {...p}>
    <path d="M9.5 18h5M10 21h4M12 3a6 6 0 00-3.8 10.6c.7.6 1.3 1.4 1.3 2.4h5c0-1 .6-1.8 1.3-2.4A6 6 0 0012 3z" />
  </Svg>
);

// —— 灵感库分类图标 ——
export const IconFilm = (p: P) => (
  <Svg {...p}>
    <path d="M4 9V6a1 1 0 011-1h14a1 1 0 011 1v3M4 9h16v9a1 1 0 01-1 1H5a1 1 0 01-1-1V9z" />
    <path d="M8.5 5L7 9M13 5l-1.5 4M17.5 5L16 9" />
  </Svg>
);

export const IconMountain = (p: P) => (
  <Svg {...p}>
    <path d="M3 19l5.5-9.5 3.5 5.5 2.5-3.5L21 19z" />
    <circle cx="7.5" cy="7" r="1.5" />
  </Svg>
);

export const IconPalette = (p: P) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 100 18c1 0 1.6-1 1-2s0-2 1.5-2H18a3 3 0 003-3c0-5-4-8-9-8z" />
    {dot(8, 9)}
    {dot(12, 7.5)}
    {dot(16, 9)}
  </Svg>
);

export const IconBox = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
  </Svg>
);

export const IconFood = (p: P) => (
  <Svg {...p}>
    <path d="M7 3v6a2 2 0 104 0V3M9 9v12" />
    <path d="M16.5 3c-1.2 0-2 2-2 4.5s.8 3.5 2 3.5M16.5 3v18" />
  </Svg>
);

export const IconBuilding = (p: P) => (
  <Svg {...p}>
    <path d="M3 9l9-5 9 5M3 21h18M5 9v10M9.5 9v10M14.5 9v10M19 9v10" />
  </Svg>
);
