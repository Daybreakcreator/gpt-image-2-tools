// SEO 落地页数据：每个能力一页，针对性关键词 + 双语内容 + FAQ（喂 JSON-LD）。
// 纯静态预渲染，不依赖 JS。新增页面只需往 LANDINGS 里加一项。
export interface FaqItem {
  q_zh: string;
  a_zh: string;
  q_en: string;
  a_en: string;
}

export interface Landing {
  slug: string; // URL: /<slug>
  title: string; // <title> + og:title
  description: string; // meta description
  h1_zh: string;
  h1_en: string;
  sub_zh: string;
  sub_en: string;
  intro_zh: string;
  intro_en: string;
  steps_zh: string[];
  steps_en: string[];
  faq: FaqItem[];
}

export const LANDINGS: Landing[] = [
  {
    slug: 'text-to-image',
    title: 'AI 文生图在线工具 · 输入文字生成图片 — GPT-Image-2 Tools',
    description:
      '免费在线 AI 文生图：写一句话就生成图片。BYOK 纯客户端，支持自定义 OpenAI 兼容端点、可调尺寸/质量/张数，密钥只存浏览器永不离开本机。',
    h1_zh: 'AI 文生图：写一句话，生成图片',
    h1_en: 'AI Text-to-Image: type a sentence, get a picture',
    sub_zh: '在输入框写下你的画面描述，直接生成图像。可调尺寸、质量、张数，一键继续迭代。',
    sub_en: 'Describe the image you want and generate it instantly. Tune size, quality and count, iterate in one click.',
    intro_zh:
      '文生图（Text-to-Image）就是用自然语言描述生成图像。GPT-Image-2 Tools 接任意 OpenAI 兼容图像端点，纯客户端运行——你填自己的 API 地址和密钥，浏览器直连，无服务器中转，密钥只存本机。适合做插画、封面、概念图、海报草稿。',
    intro_en:
      'Text-to-image turns a natural-language prompt into a picture. GPT-Image-2 Tools works with any OpenAI-compatible image endpoint and runs fully client-side — you bring your own API base URL and key, the browser connects directly with no server relay, and the key stays on your device. Great for illustrations, covers, concept art and poster drafts.',
    steps_zh: ['在设置里填好 API 地址和密钥（只存浏览器）', '在输入框写下画面描述，选尺寸/质量/张数', '回车生成，满意的结果可一键「以此继续」迭代'],
    steps_en: ['Add your API base URL and key in Settings (stored only in your browser)', 'Type your prompt, pick size / quality / count', 'Press Enter to generate, then iterate on any result in one click'],
    faq: [
      {
        q_zh: '文生图需要注册吗？',
        a_zh: '不需要注册本站。它是纯客户端工具，你用自己的 OpenAI 兼容密钥，配置只存在浏览器本地。',
        q_en: 'Do I need to sign up?',
        a_en: 'No signup here. It is a fully client-side tool — you use your own OpenAI-compatible key and your config is stored only in your browser.',
      },
      {
        q_zh: '我的密钥安全吗？',
        a_zh: '密钥只存在你浏览器的 localStorage，浏览器直连你填的端点，绝不经过我们的服务器。',
        q_en: 'Is my key safe?',
        a_en: 'Your key lives only in your browser localStorage and connects directly to the endpoint you set — it never passes through our servers.',
      },
      {
        q_zh: '支持哪些模型？',
        a_zh: '任何 OpenAI 兼容的图像生成端点，模型名可在设置里搜索选择或手动填写。',
        q_en: 'Which models are supported?',
        a_en: 'Any OpenAI-compatible image endpoint; pick the model from the searchable list in Settings or type it in.',
      },
    ],
  },
  {
    slug: 'image-to-image',
    title: 'AI 图生图 / 在线改图工具 · 拖图就能改 — GPT-Image-2 Tools',
    description:
      '在线 AI 图生图（image-to-image）：拖一张图进来，用文字描述就能改风格、改细节、扩展画面。BYOK 纯客户端，密钥只存浏览器。',
    h1_zh: 'AI 图生图：拖一张图进来就能改',
    h1_en: 'AI Image-to-Image: drop a picture and edit it',
    sub_zh: '上传或拖入一张图，用一句话描述你想要的改动，直接生成新版本。',
    sub_en: 'Drop in an image, describe the change you want in words, and generate a new version.',
    intro_zh:
      '图生图（Image-to-Image）是在已有图像基础上做编辑、改风格或扩展。GPT-Image-2 Tools 把它和文生图合并在同一个输入框：拖图进来就自动切到改图模式，配合 Prompt 即可。纯客户端、密钥只存本机，适合改风格、补细节、出多版方案。',
    intro_en:
      'Image-to-image edits, restyles or extends an existing picture. GPT-Image-2 Tools merges it with text-to-image in one input: drop an image and it switches to edit mode automatically, then describe what to change. Fully client-side, key stays on your device — ideal for restyling, refining details and producing variations.',
    steps_zh: ['填好 API 地址和密钥（只存浏览器）', '把图片拖进输入框，自动进入改图模式', '写下想要的改动，生成；可对结果继续迭代'],
    steps_en: ['Add your API base URL and key (stored only in your browser)', 'Drag an image into the input — it switches to edit mode', 'Describe the change and generate; keep iterating on results'],
    faq: [
      {
        q_zh: '图生图和文生图怎么切换？',
        a_zh: '不用切换。输入框是统一的——没图就是文生图，拖入图片就自动变成图生图/改图。',
        q_en: 'How do I switch between modes?',
        a_en: 'You do not. The input is unified — no image means text-to-image; drop an image and it becomes image-to-image automatically.',
      },
      {
        q_zh: '可以一次改多张图吗？',
        a_zh: '可以附多张参考图，并设置一次生成多张结果，方便对比挑选。',
        q_en: 'Can I edit multiple images?',
        a_en: 'You can attach multiple reference images and generate several outputs at once to compare.',
      },
      {
        q_zh: '改完的图能继续改吗？',
        a_zh: '可以。任意结果点「以此继续」，把它作为新输入接着改，形成迭代链路。',
        q_en: 'Can I keep editing the result?',
        a_en: 'Yes. Click "continue from this" on any result to feed it back as the new input and iterate.',
      },
    ],
  },
  {
    slug: 'inpaint',
    title: 'AI 局部重绘 / 在线 Inpaint 工具 · 涂哪改哪 — GPT-Image-2 Tools',
    description:
      '在线 AI 局部重绘（inpainting）：用画笔涂出要改的区域，只重画选中部分，其余保持不变。BYOK 纯客户端，密钥只存浏览器。',
    h1_zh: 'AI 局部重绘：涂哪里，改哪里',
    h1_en: 'AI Inpainting: paint a region, change only that part',
    sub_zh: '用画笔在图上涂出要修改的区域，写下想要的内容，只重绘选中部分。',
    sub_en: 'Brush over the area to change, describe what you want, and only the masked region is repainted.',
    intro_zh:
      '局部重绘（Inpainting）只重画你圈出的区域，其余像素保持不变——适合换物体、修瑕疵、改局部细节。GPT-Image-2 Tools 内置遮罩画笔（画笔/橡皮/撤销），纯客户端运行，密钥只存本机。',
    intro_en:
      'Inpainting repaints only the region you mark while keeping the rest intact — perfect for swapping objects, fixing flaws or changing local details. GPT-Image-2 Tools ships a built-in mask brush (paint / erase / undo), runs fully client-side, and keeps your key on your device.',
    steps_zh: ['拖入要修改的图片', '用画笔涂出要重绘的区域（可橡皮/撤销）', '写下该区域想要的内容，生成'],
    steps_en: ['Drop in the image you want to edit', 'Brush over the area to repaint (erase / undo available)', 'Describe what should appear there and generate'],
    faq: [
      {
        q_zh: '局部重绘会动到其他区域吗？',
        a_zh: '只重绘你涂出的遮罩区域，未涂的部分尽量保持原样。',
        q_en: 'Will it change the rest of the image?',
        a_en: 'Only the masked area you paint is repainted; the unmasked parts are kept as-is.',
      },
      {
        q_zh: '涂错了能撤销吗？',
        a_zh: '可以，遮罩画笔支持橡皮和撤销，随时调整选区。',
        q_en: 'Can I undo a wrong stroke?',
        a_en: 'Yes — the mask brush supports erase and undo so you can refine the selection anytime.',
      },
      {
        q_zh: '需要单独的 inpaint 模型吗？',
        a_zh: '用你配置的 OpenAI 兼容图像端点即可，工具会带上遮罩发起编辑请求。',
        q_en: 'Do I need a special inpaint model?',
        a_en: 'Your configured OpenAI-compatible image endpoint is enough; the tool sends the mask with the edit request.',
      },
    ],
  },
  {
    slug: 'gpt-image-online',
    title: 'GPT-Image 在线使用 · 免安装的图像生成工具 — GPT-Image-2 Tools',
    description:
      '在线使用 GPT-Image / OpenAI 兼容图像模型：文生图、图生图、局部重绘一个输入框搞定。免安装、纯客户端，密钥只存浏览器永不离开本机。',
    h1_zh: 'GPT-Image 在线使用：一个输入框搞定',
    h1_en: 'Use GPT-Image online: one input does it all',
    sub_zh: '免安装、纯客户端的图像创作工具。文生图、图生图、局部重绘、迭代，统一在一个输入框。',
    sub_en: 'An install-free, fully client-side image studio. Generate, edit, inpaint and iterate from one unified input.',
    intro_zh:
      'GPT-Image-2 Tools 让你在浏览器里直接用 GPT-Image 这类 OpenAI 兼容图像模型：无需安装、无需注册本站，填入你自己的 API 地址和密钥即可。文生图、图生图、局部重绘、流式预览、历史记录全都有，密钥只存浏览器、浏览器直连端点、无服务器中转。',
    intro_en:
      'GPT-Image-2 Tools lets you use GPT-Image-style OpenAI-compatible models right in the browser: no install, no signup here — just bring your own API base URL and key. Text-to-image, image-to-image, inpainting, streaming previews and history are all built in, with the key stored only in your browser and a direct connection to your endpoint.',
    steps_zh: ['打开设置，填入 API 地址和密钥（只存浏览器）', '在输入框写文字生成，或拖图进来改图', '用遮罩画笔做局部重绘，结果可继续迭代'],
    steps_en: ['Open Settings and add your API base URL and key (stored only in your browser)', 'Type to generate, or drop an image to edit', 'Use the mask brush to inpaint, and iterate on any result'],
    faq: [
      {
        q_zh: '需要安装什么吗？',
        a_zh: '不用。它是网页工具，打开就能用，配置只存在你的浏览器里。',
        q_en: 'Do I need to install anything?',
        a_en: 'No. It is a web tool — open and use it; your config lives only in your browser.',
      },
      {
        q_zh: '可以连自建/中转端点吗？',
        a_zh: '可以，任何 OpenAI 兼容的图像地址都行，在设置里填 API 地址即可。',
        q_en: 'Can I use a self-hosted or proxy endpoint?',
        a_en: 'Yes — any OpenAI-compatible image base URL works; just set it in Settings.',
      },
      {
        q_zh: '数据会上传到你们服务器吗？',
        a_zh: '不会。Prompt、密钥、图像都只在你本机和你填的端点之间传输，我们只做一个匿名生成计数。',
        q_en: 'Is my data uploaded to your servers?',
        a_en: 'No. Prompts, keys and images only travel between your device and your endpoint; we keep only an anonymous generation count.',
      },
    ],
  },
];
