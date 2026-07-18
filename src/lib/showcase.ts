// 灵感展示 / Prompt 画廊。public/showcase/<id>.png 存在时用真图，否则用设计渐变占位。
import type { Lang } from './i18n';
import type { Size, Quality } from './openai';
import images from './showcase-images.json';

export type ShotCat = 'cinematic' | 'scenery' | 'art' | 'product' | 'food' | 'arch';
// 主题分类（chips 顺序）。i18n key 为 cat.<id>
export const CATEGORIES: ShotCat[] = ['cinematic', 'scenery', 'art', 'product', 'food', 'arch'];

export interface Shot {
  id: string;
  title: string;
  titleEn: string;
  prompt: string;
  promptEn: string;
  gradient: string;
  ratio: 'square' | 'portrait' | 'landscape';
  cat: ShotCat;
  quality: Quality; // 复刻该效果的推荐质量
}

export const SHOWCASE: Shot[] = [
  {
    id: 'peaks', title: '金色雪峰', titleEn: 'Golden peaks', ratio: 'landscape', cat: 'scenery', quality: 'high',
    prompt: '航拍金色时刻的雪山群峰，戏剧性光影，fine-art 风光摄影，超细节',
    promptEn: 'Aerial view of snow-capped peaks at golden hour, dramatic light, fine-art landscape photography, ultra detailed',
    gradient: 'radial-gradient(120% 90% at 70% 15%, #fde68a 0%, transparent 45%), linear-gradient(180deg,#0c1e3d 0%,#5b1f4e 55%,#f4a261 100%)',
  },
  {
    id: 'tokyo', title: '雨夜东京', titleEn: 'Rainy Tokyo', ratio: 'portrait', cat: 'cinematic', quality: 'high',
    prompt: '雨夜东京小巷，霓虹倒影，电影感，宽银幕，氛围阴郁，超细节',
    promptEn: 'Neon-lit Tokyo alley in the rain, cinematic, anamorphic, moody atmosphere, ultra detailed',
    gradient: 'radial-gradient(80% 50% at 30% 25%, rgba(236,72,153,.5) 0%, transparent 50%), linear-gradient(180deg,#0c0a3e 0%,#7c3aed 55%,#ec4899 100%)',
  },
  {
    id: 'glass', title: '琉璃雕塑', titleEn: 'Glass sculpture', ratio: 'square', cat: 'product', quality: 'medium',
    prompt: '基座上的虹彩吹制玻璃雕塑，柔和影棚光，3D 渲染，质感高级',
    promptEn: 'Iridescent blown-glass sculpture on a pedestal, soft studio lighting, premium 3D render',
    gradient: 'radial-gradient(90% 70% at 50% 30%, #a7f3d0 0%, transparent 55%), linear-gradient(180deg,#064e3b 0%,#0ea5e9 100%)',
  },
  {
    id: 'plating', title: '米其林摆盘', titleEn: 'Fine plating', ratio: 'square', cat: 'food', quality: 'high',
    prompt: '深色陶瓷上的米其林精致摆盘，俯视，杂志级美食摄影，戏剧光影',
    promptEn: 'Michelin-style plated dish on dark ceramic, top-down, editorial food photography, dramatic light',
    gradient: 'radial-gradient(70% 70% at 60% 40%, rgba(251,191,36,.55) 0%, transparent 55%), linear-gradient(160deg,#1a1a2e 0%,#e94560 100%)',
  },
  {
    id: 'whale', title: '深海巨鲸', titleEn: 'Deep whale', ratio: 'landscape', cat: 'scenery', quality: 'high',
    prompt: '深蓝海中的座头鲸，光束，fine-art 水下摄影，宁静，超细节',
    promptEn: 'Lone humpback whale in deep blue water, light rays, fine-art underwater, serene, ultra detailed',
    gradient: 'radial-gradient(80% 60% at 40% 10%, rgba(255,255,255,.4) 0%, transparent 45%), linear-gradient(180deg,#0ea5e9 0%,#1e3a8a 70%,#020617 100%)',
  },
  {
    id: 'fox', title: '水彩狐狸', titleEn: 'Watercolor fox', ratio: 'portrait', cat: 'art', quality: 'medium',
    prompt: '优雅红狐肖像，柔和水彩，金箔点缀，博物馆级质感',
    promptEn: 'Elegant red fox portrait, soft watercolor with gold leaf accents, museum quality',
    gradient: 'radial-gradient(70% 60% at 50% 40%, #fdba74 0%, transparent 55%), linear-gradient(160deg,#fff7ed 0%,#f97316 70%,#7c2d12 100%)',
  },
  {
    id: 'brutalist', title: '粗野建筑', titleEn: 'Brutalist', ratio: 'square', cat: 'arch', quality: 'high',
    prompt: '金色时刻的粗野主义混凝土建筑，强烈光影，对称构图，fine-art',
    promptEn: 'Brutalist concrete architecture at golden hour, strong shadows, symmetric composition, fine-art',
    gradient: 'linear-gradient(135deg,#e0e7ff 0%,#94a3b8 55%,#1e293b 100%)',
  },
  {
    id: 'watch', title: '机芯微距', titleEn: 'Watch macro', ratio: 'portrait', cat: 'product', quality: 'high',
    prompt: '奢华机械腕表机芯微距，黄铜与宝石，戏剧光影，超细节',
    promptEn: 'Macro of a luxury mechanical watch movement, brass and jewels, dramatic light, ultra detailed',
    gradient: 'radial-gradient(80% 60% at 50% 30%, #fcd34d 0%, transparent 55%), linear-gradient(160deg,#3b2f1e 0%,#92400e 70%,#1c1917 100%)',
  },
  {
    id: 'camp', title: '星空帐篷', titleEn: 'Starry camp', ratio: 'landscape', cat: 'cinematic', quality: 'high',
    prompt: '银河下的发光帐篷，群山剪影，长曝光，电影感，宁静',
    promptEn: 'A glowing tent under the Milky Way, mountain silhouettes, long-exposure, cinematic, serene',
    gradient: 'radial-gradient(60% 50% at 50% 80%, rgba(251,191,36,.5) 0%, transparent 45%), linear-gradient(180deg,#020617 0%,#1e1b4b 60%,#312e81 100%)',
  },
  {
    id: 'noir', title: '黑色电影', titleEn: 'Film noir', ratio: 'portrait', cat: 'cinematic', quality: 'high',
    prompt: '1940 年代黑色电影里的侦探，烟雾缭绕的办公室，百叶窗光影，黑白，电影感，强烈明暗对比',
    promptEn: '1940s film noir detective in a smoky office, venetian blind shadows, black and white, cinematic, dramatic chiaroscuro',
    gradient: 'radial-gradient(70% 50% at 35% 25%, rgba(255,255,255,.35) 0%, transparent 50%), linear-gradient(180deg,#0a0a0c 0%,#26262b 60%,#3f3f46 100%)',
  },
  {
    id: 'dunes', title: '落日沙丘', titleEn: 'Sunset dunes', ratio: 'landscape', cat: 'scenery', quality: 'high',
    prompt: '落日下广袤的沙漠沙丘，波纹质感，长长的影子，暖色调，fine-art 风光摄影',
    promptEn: 'Vast desert sand dunes at sunset, rippled textures, long shadows, warm tones, fine-art landscape photography',
    gradient: 'radial-gradient(90% 70% at 70% 20%, #fcd34d 0%, transparent 50%), linear-gradient(160deg,#7c2d12 0%,#ea580c 55%,#fdba74 100%)',
  },
  {
    id: 'inkwash', title: '水墨山水', titleEn: 'Ink-wash', ratio: 'landscape', cat: 'art', quality: 'medium',
    prompt: '中国水墨山水，云雾缭绕的山峰，极简留白，宣纸质感，传统水墨',
    promptEn: 'Chinese ink-wash mountain landscape, misty peaks, minimalist negative space, rice-paper texture, traditional sumi-e',
    gradient: 'radial-gradient(80% 60% at 40% 30%, rgba(255,255,255,.5) 0%, transparent 55%), linear-gradient(180deg,#f5f5f0 0%,#9ca3af 60%,#374151 100%)',
  },
  {
    id: 'popart', title: '波普肖像', titleEn: 'Pop-art', ratio: 'square', cat: 'art', quality: 'medium',
    prompt: '大胆的波普艺术肖像，半调网点，高饱和互补色，丝网印刷风格，沃霍尔式',
    promptEn: 'Bold pop-art portrait, halftone dots, saturated complementary colors, screen-print style, Warhol-inspired',
    gradient: 'radial-gradient(60% 60% at 30% 30%, #fde047 0%, transparent 50%), radial-gradient(60% 60% at 70% 70%, #22d3ee 0%, transparent 50%), linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%)',
  },
  {
    id: 'sneaker', title: '球鞋广告', titleEn: 'Sneaker ad', ratio: 'square', cat: 'product', quality: 'high',
    prompt: '悬浮的未来感球鞋产品图，影棚渐变背景，戏剧性轮廓光，超写实，广告大片',
    promptEn: 'Floating futuristic sneaker product shot, studio gradient backdrop, dramatic rim light, hyperrealistic, advertising',
    gradient: 'radial-gradient(80% 60% at 50% 30%, #c4b5fd 0%, transparent 55%), linear-gradient(160deg,#1e1b4b 0%,#4f46e5 70%,#0ea5e9 100%)',
  },
  {
    id: 'coffee', title: '拉花咖啡', titleEn: 'Latte art', ratio: 'square', cat: 'food', quality: 'medium',
    prompt: '俯拍大理石桌上的拿铁拉花，柔和自然光，杂志级咖啡摄影',
    promptEn: 'Top-down flat white with latte art on a marble table, soft natural light, editorial coffee photography',
    gradient: 'radial-gradient(70% 60% at 50% 35%, #fef3c7 0%, transparent 55%), linear-gradient(160deg,#fafaf9 0%,#d6b48f 60%,#78350f 100%)',
  },
  {
    id: 'ramen', title: '豚骨拉面', titleEn: 'Tonkotsu ramen', ratio: 'square', cat: 'food', quality: 'high',
    prompt: '热气腾腾的豚骨拉面，溏心蛋，筷子夹起面条，暗调美食摄影，蒸汽升腾',
    promptEn: 'Steaming bowl of tonkotsu ramen, soft-boiled egg, chopsticks lifting noodles, moody dark food photography, rising steam',
    gradient: 'radial-gradient(70% 50% at 50% 20%, rgba(255,255,255,.3) 0%, transparent 45%), linear-gradient(170deg,#1c1917 0%,#7c2d12 65%,#ea580c 100%)',
  },
  {
    id: 'atrium', title: '美术馆中庭', titleEn: 'Museum atrium', ratio: 'portrait', cat: 'arch', quality: 'high',
    prompt: '现代美术馆中庭，流畅的白色曲线，天窗采光，极简建筑，广角，柔和日光',
    promptEn: 'Modern museum atrium, sweeping white curves, skylight, minimalist architecture, wide-angle, soft daylight',
    gradient: 'radial-gradient(80% 60% at 50% 15%, #ffffff 0%, transparent 55%), linear-gradient(180deg,#e0f2fe 0%,#93c5fd 60%,#475569 100%)',
  },
  {
    id: 'temple', title: '京都红枫', titleEn: 'Kyoto in autumn', ratio: 'landscape', cat: 'arch', quality: 'high',
    prompt: '秋日京都古寺，红枫，金色时刻，宁静，fine-art 建筑摄影',
    promptEn: 'Traditional Kyoto temple in autumn, red maple leaves, golden hour, serene, fine-art architecture photography',
    gradient: 'radial-gradient(80% 60% at 40% 25%, #fcd34d 0%, transparent 50%), linear-gradient(160deg,#7f1d1d 0%,#dc2626 55%,#f59e0b 100%)',
  },
];

// 复刻效果的推荐尺寸：由画幅比例派生
export const shotSize = (s: Shot): Size => (s.ratio === 'landscape' ? '1536x1024' : s.ratio === 'portrait' ? '1024x1536' : '1024x1024');

const imageMap = images as Record<string, string>;
export const shotImage = (s: Shot): string | undefined => imageMap[s.id];
// 小缩略图（用于 composer 示例卡，性能友好）；无真图时返回 undefined 由渐变兜底
export const shotThumb = (s: Shot): string | undefined => (imageMap[s.id] ? `/showcase/thumb/${s.id}.jpg` : undefined);
export const shotTitle = (s: Shot, lang: Lang) => (lang === 'en' ? s.titleEn : s.title);
export const shotPrompt = (s: Shot, lang: Lang) => (lang === 'en' ? s.promptEn : s.prompt);
