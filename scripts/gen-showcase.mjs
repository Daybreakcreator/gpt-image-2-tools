// 用你的 API 生成 showcase 图片，存到 public/showcase/<id>.png，并回填 src/lib/showcase-images.json。
// 用法：cp .env.example .env 填好后 -> npm run gen:showcase
import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = (process.env.IMAGE_BASE_URL || '').replace(/\/$/, '');
const apiKey = process.env.IMAGE_API_KEY || '';
const model = process.env.IMAGE_MODEL || 'gpt-image-1';

if (!baseUrl || !apiKey) {
  console.error('✗ 请先 cp .env.example .env，并填好 IMAGE_BASE_URL 和 IMAGE_API_KEY');
  process.exit(1);
}

// 与 src/lib/showcase.ts 的 id 对应（用英文 prompt，出图更稳）
const SHOTS = [
  { id: 'peaks', size: '1536x1024', prompt: 'Aerial view of snow-capped peaks at golden hour, dramatic light, fine-art landscape photography, ultra detailed' },
  { id: 'tokyo', size: '1024x1536', prompt: 'Neon-lit Tokyo alley in the rain, cinematic, anamorphic, moody atmosphere, ultra detailed' },
  { id: 'glass', size: '1024x1024', prompt: 'Iridescent blown-glass sculpture on a pedestal, soft studio lighting, premium 3D render' },
  { id: 'plating', size: '1024x1024', prompt: 'Michelin-style plated dish on dark ceramic, top-down, editorial food photography, dramatic light' },
  { id: 'whale', size: '1536x1024', prompt: 'Lone humpback whale in deep blue water, light rays, fine-art underwater, serene, ultra detailed' },
  { id: 'fox', size: '1024x1536', prompt: 'Elegant red fox portrait, soft watercolor with gold leaf accents, museum quality' },
  { id: 'brutalist', size: '1024x1024', prompt: 'Brutalist concrete architecture at golden hour, strong shadows, symmetric composition, fine-art' },
  { id: 'watch', size: '1024x1536', prompt: 'Macro of a luxury mechanical watch movement, brass and jewels, dramatic light, ultra detailed' },
  { id: 'camp', size: '1536x1024', prompt: 'A glowing tent under the Milky Way, mountain silhouettes, long-exposure, cinematic, serene' },
  { id: 'noir', size: '1024x1536', prompt: '1940s film noir detective in a smoky office, venetian blind shadows, black and white, cinematic, dramatic chiaroscuro' },
  { id: 'dunes', size: '1536x1024', prompt: 'Vast desert sand dunes at sunset, rippled textures, long shadows, warm tones, fine-art landscape photography' },
  { id: 'inkwash', size: '1536x1024', prompt: 'Chinese ink-wash mountain landscape, misty peaks, minimalist negative space, rice-paper texture, traditional sumi-e' },
  { id: 'popart', size: '1024x1024', prompt: 'Bold pop-art portrait, halftone dots, saturated complementary colors, screen-print style, Warhol-inspired' },
  { id: 'sneaker', size: '1024x1024', prompt: 'Floating futuristic sneaker product shot, studio gradient backdrop, dramatic rim light, hyperrealistic, advertising' },
  { id: 'coffee', size: '1024x1024', prompt: 'Top-down flat white with latte art on a marble table, soft natural light, editorial coffee photography' },
  { id: 'ramen', size: '1024x1024', prompt: 'Steaming bowl of tonkotsu ramen, soft-boiled egg, chopsticks lifting noodles, moody dark food photography, rising steam' },
  { id: 'atrium', size: '1024x1536', prompt: 'Modern museum atrium, sweeping white curves, skylight, minimalist architecture, wide-angle, soft daylight' },
  { id: 'temple', size: '1536x1024', prompt: 'Traditional Kyoto temple in autumn, red maple leaves, golden hour, serene, fine-art architecture photography' },
];

await mkdir(join(root, 'public', 'showcase'), { recursive: true });
const mapPath = join(root, 'src', 'lib', 'showcase-images.json');
const exists = async (p) => access(p).then(() => true).catch(() => false);

// 合并已有映射，避免覆盖
const map = JSON.parse(await readFile(mapPath, 'utf8').catch(() => '{}'));
const writeMap = () => writeFile(mapPath, JSON.stringify(map, null, 2) + '\n');

for (const s of SHOTS) {
  const file = join(root, 'public', 'showcase', `${s.id}.png`);
  if (await exists(file)) {
    map[s.id] = `/showcase/${s.id}.png`;
    await writeMap();
    console.log(`跳过 ${s.id}（已存在）`);
    continue;
  }
  process.stdout.write(`生成 ${s.id} … `);
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 120000); // 单次 120s 超时
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt: s.prompt, n: 1, size: s.size, quality: 'medium' }),
      signal: ac.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.log('失败', res.status, (await res.text()).slice(0, 160));
      continue;
    }
    const j = await res.json();
    const d = j.data?.[0];
    let buf;
    if (d?.b64_json) buf = Buffer.from(d.b64_json, 'base64');
    else if (d?.url) buf = Buffer.from(await (await fetch(d.url)).arrayBuffer());
    else {
      console.log('无图数据');
      continue;
    }
    await writeFile(file, buf);
    map[s.id] = `/showcase/${s.id}.png`;
    await writeMap(); // 增量写，崩了也不丢进度
    console.log('✓');
  } catch (e) {
    console.log('错误', e.name === 'AbortError' ? '超时(120s)' : e.message);
  }
}

await writeMap();
console.log(`\n完成 ${Object.keys(map).length}/${SHOTS.length} 张 -> public/showcase/，已回填 showcase-images.json`);
console.log('接下来：npm run build 然后部署（或告诉我，我来构建+部署）');
