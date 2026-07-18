// 上手素材：示例 Prompt（点一下即填）+ 风格标签（一键追加 / 自动补全）。
import type { Lang } from './i18n';

export interface ExamplePrompt {
  label: string;
  labelEn: string;
  prompt: string;
  promptEn: string;
  gradient: string;
}

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  { label: '雪山日出', labelEn: 'Snow sunrise', prompt: '雪山日出，电影感构图，冷色调天空与暖色调云层形成对比，35mm 胶片质感', promptEn: 'Snow mountain at sunrise, cinematic composition, cool sky against warm clouds, 35mm film', gradient: 'linear-gradient(160deg,#fbbf24 0%,#ec4899 60%,#1e1b4b 100%)' },
  { label: '赛博城市', labelEn: 'Cyber city', prompt: '雨夜赛博朋克街道，霓虹招牌倒映在湿漉漉的地面，电影感，氛围阴郁', promptEn: 'Rainy cyberpunk street at night, neon signs reflecting on wet ground, cinematic, moody', gradient: 'linear-gradient(180deg,#0c0a3e 0%,#7c3aed 50%,#ec4899 100%)' },
  { label: '水彩植物', labelEn: 'Watercolor plant', prompt: '一株绿植在窗边，细腻水彩，柔和边缘，淡彩配色', promptEn: 'A potted plant by the window, delicate watercolor, soft edges, pastel palette', gradient: 'linear-gradient(180deg,#e0e7ff 0%,#86efac 100%)' },
  { label: '黑白人像', labelEn: 'B&W portrait', prompt: '黑白人像摄影，柔和侧光，浅景深，35mm', promptEn: 'Black and white portrait photography, soft side light, shallow depth of field, 35mm', gradient: 'linear-gradient(160deg,#1f2937 0%,#374151 60%,#9ca3af 100%)' },
  { label: '复古胶片', labelEn: 'Retro film', prompt: '复古胶片风格的午后街角，暖色调，颗粒感，怀旧', promptEn: 'Retro film street corner in the afternoon, warm tones, grain, nostalgic', gradient: 'linear-gradient(180deg,#fef3c7 0%,#f97316 100%)' },
  { label: '海底世界', labelEn: 'Underwater', prompt: '梦幻海底世界，珊瑚与光束，超细节，8k', promptEn: 'Dreamy underwater world, coral and light beams, ultra detailed, 8k', gradient: 'linear-gradient(160deg,#a7f3d0 0%,#0ea5e9 70%,#1e3a8a 100%)' },
];

export interface StyleTag {
  label: string;
  labelEn: string;
  append: string;
}

export const STYLE_TAGS: StyleTag[] = [
  { label: '电影感', labelEn: 'Cinematic', append: 'cinematic lighting' },
  { label: '等距', labelEn: 'Isometric', append: 'isometric' },
  { label: '水彩', labelEn: 'Watercolor', append: 'watercolor painting' },
  { label: '线稿', labelEn: 'Line art', append: 'line art' },
  { label: '胶片', labelEn: 'Film', append: 'film grain, 35mm' },
  { label: '柔光', labelEn: 'Soft light', append: 'soft diffused light' },
  { label: '3D', labelEn: '3D', append: '3D render' },
  { label: '霓虹', labelEn: 'Neon', append: 'neon glow' },
  { label: '超细节', labelEn: 'Detailed', append: 'ultra detailed, 8k' },
  { label: '俯视', labelEn: 'Top-down', append: 'top-down view' },
  { label: '微距', labelEn: 'Macro', append: 'macro close-up' },
];

export const exLabel = (e: ExamplePrompt, lang: Lang) => (lang === 'en' ? e.labelEn : e.label);
export const exPrompt = (e: ExamplePrompt, lang: Lang) => (lang === 'en' ? e.promptEn : e.prompt);
export const tagLabel = (t: StyleTag, lang: Lang) => (lang === 'en' ? t.labelEn : t.label);
