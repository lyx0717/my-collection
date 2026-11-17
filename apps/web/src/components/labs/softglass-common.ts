/**
 * 柔光玻璃实验室 —— 共享算法
 *
 * 这里只放三块面板共用的纯函数：
 *   1) 测试底图的 SVG 源码（同一份字符串既渲染可见底图，也栅格化成采样源）
 *   2) 环境色 / 自适应通透度的采样与推导公式
 *   3) A 方案 CSS 导出
 *
 * 采样统一走 canvas.drawImage：把底图栅格按面板矩形裁剪、缩小到 80×80，
 * 再读像素算平均色与亮度统计。频率由页面控制（500ms/次），不是每帧。
 */

export type Theme = 'light' | 'dark'

export interface LabParams {
  /** 模糊基准 px，0–32 */
  blur: number
  /** 环境色 tint 强度 0–100 */
  tint: number
  /** rim light 强度 0–100 */
  rim: number
}

export interface PanelRect {
  left: number
  top: number
  width: number
  height: number
}

export interface RegionSample {
  /** 面板背后的采样区域是否变化（用于避免无意义的 React 重渲染） */
  key: string
  /** 平均色，sRGB 0–1，已做一档饱和度提升 */
  rgb: [number, number, number]
  /** 平均相对亮度 0–1 */
  mean: number
  /** 亮度标准差 0–1 */
  sigma: number
  /** 相邻采样点亮度差的均值（细节密度）0–1 */
  edge: number
  /** 背景复杂度 0–1 */
  busy: number
}

export interface GlassLook {
  blur: number
  alpha: number
  sat: number
  bright: number
  tintRgb: [number, number, number] | null
  tintAlpha: number
  rimCool: number
  rimWarm: number
  busy: number
  /** 直接展开到面板 style 上的 CSS 变量 */
  vars: Record<string, string>
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif"

/* ==================================================================
   测试底图
   一块 1600×1000 的用户坐标画布，preserveAspectRatio="xMidYMid slice"
   铺满视口。刻意塞进：左上明亮区、右下深色区、青/品红/橙/柠檬高饱和块、
   多组 9–11px 细字 —— 玻璃「有东西可透」才谈得上对比。
   ================================================================== */

interface Palette {
  base: [string, string, string]
  glowCore: string
  glowMid: string
  dark: string
  cyan: string
  magenta: string
  orange: string
  lime: string
  violet: string
  ink: string
  inkDim: string
  grid: string
}

const PALETTE: Record<Theme, Palette> = {
  light: {
    base: ['#f7f4ee', '#e9eef7', '#dde5f1'],
    glowCore: '#ffffff',
    glowMid: '#ffe8c4',
    dark: '#0d1018',
    cyan: '#00b7d4',
    magenta: '#ff3d9a',
    orange: '#ff8a3d',
    lime: '#a8e10c',
    violet: '#6f5bff',
    ink: '#22262f',
    inkDim: '#4a5263',
    grid: '#5a6478',
  },
  dark: {
    base: ['#05070c', '#0b101b', '#060810'],
    glowCore: '#ffffff',
    glowMid: '#5fb8ff',
    dark: '#000000',
    cyan: '#22e0ff',
    magenta: '#ff3fb4',
    orange: '#ff9a4d',
    lime: '#b8ff3d',
    violet: '#7d6bff',
    ink: '#eef2fc',
    inkDim: '#c6d0e6',
    grid: '#ffffff',
  },
}

export function backdropMarkup(theme: Theme): string {
  const p = PALETTE[theme]
  const dark = theme === 'dark'
  const inkA = dark ? 0.62 : 0.52
  const inkB = dark ? 0.42 : 0.36
  const inkC = dark ? 0.3 : 0.24

  return `
<defs>
  <linearGradient id="sgb-base" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${p.base[0]}"/>
    <stop offset="0.52" stop-color="${p.base[1]}"/>
    <stop offset="1" stop-color="${p.base[2]}"/>
  </linearGradient>
  <radialGradient id="sgb-bloom" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${p.glowCore}" stop-opacity="${dark ? 0.5 : 0.98}"/>
    <stop offset="0.42" stop-color="${p.glowMid}" stop-opacity="${dark ? 0.24 : 0.5}"/>
    <stop offset="1" stop-color="${p.glowMid}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="sgb-night" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${p.dark}" stop-opacity="${dark ? 0.92 : 0.88}"/>
    <stop offset="0.6" stop-color="${p.dark}" stop-opacity="${dark ? 0.6 : 0.52}"/>
    <stop offset="1" stop-color="${p.dark}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="sgb-cyan" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${p.cyan}"/>
    <stop offset="1" stop-color="${p.violet}"/>
  </linearGradient>
  <linearGradient id="sgb-magenta" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="${p.magenta}"/>
    <stop offset="1" stop-color="${p.orange}"/>
  </linearGradient>
  <linearGradient id="sgb-lime" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${p.lime}" stop-opacity="0.9"/>
    <stop offset="1" stop-color="${p.cyan}" stop-opacity="0.65"/>
  </linearGradient>
  <linearGradient id="sgb-ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${p.cyan}" stop-opacity="0.75"/>
    <stop offset="0.55" stop-color="${p.magenta}" stop-opacity="0.45"/>
    <stop offset="1" stop-color="${p.orange}" stop-opacity="0.2"/>
  </linearGradient>
  <radialGradient id="sgb-vignette" cx="0.5" cy="0.42" r="0.72">
    <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="${dark ? 0.55 : 0.16}"/>
  </radialGradient>
  <pattern id="sgb-grid" width="56" height="56" patternUnits="userSpaceOnUse">
    <path d="M56 0H0V56" fill="none" stroke="${p.grid}" stroke-opacity="${dark ? 0.08 : 0.07}" stroke-width="1"/>
  </pattern>
  <pattern id="sgb-dots" width="18" height="18" patternUnits="userSpaceOnUse">
    <circle cx="1.4" cy="1.4" r="1.1" fill="${p.grid}" fill-opacity="${dark ? 0.16 : 0.13}"/>
  </pattern>
  <filter id="sgb-soft" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="34"/>
  </filter>
  <filter id="sgb-soft-sm" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="12"/>
  </filter>
</defs>

<rect width="1600" height="1000" fill="url(#sgb-base)"/>

<!-- 明亮区域：左上暖白光团，A 面板主要压在它上面 -->
<ellipse cx="250" cy="235" rx="470" ry="390" fill="url(#sgb-bloom)"/>
<ellipse cx="1180" cy="140" rx="330" ry="240" fill="url(#sgb-bloom)" opacity="0.5"/>

<!-- 深色区域：右下，C 面板下半压在这里 -->
<ellipse cx="1110" cy="625" rx="590" ry="350" fill="url(#sgb-night)"/>

<!-- 高饱和色块 -->
<g filter="url(#sgb-soft)">
  <rect x="500" y="205" width="520" height="360" rx="120" fill="url(#sgb-cyan)" opacity="${dark ? 0.62 : 0.72}" transform="rotate(-13 760 385)"/>
  <circle cx="1105" cy="268" r="188" fill="url(#sgb-magenta)" opacity="${dark ? 0.6 : 0.66}"/>
  <rect x="1170" y="640" width="430" height="190" rx="90" fill="url(#sgb-magenta)" opacity="${dark ? 0.38 : 0.42}" transform="rotate(14 1385 735)"/>
  <ellipse cx="160" cy="612" rx="230" ry="96" fill="${p.orange}" opacity="${dark ? 0.34 : 0.4}"/>
</g>
<rect x="96" y="452" width="232" height="24" rx="12" fill="url(#sgb-lime)" opacity="0.9" transform="rotate(-7 212 464)"/>
<rect x="84" y="500" width="120" height="8" rx="4" fill="${p.ink}" opacity="${inkC}" transform="rotate(-7 144 504)"/>

<!-- 环 / 细线：给边缘折射一点可看的结构 -->
<circle cx="742" cy="470" r="238" fill="none" stroke="url(#sgb-ring)" stroke-width="2.5" opacity="0.55"/>
<circle cx="742" cy="470" r="286" fill="none" stroke="url(#sgb-ring)" stroke-width="1" opacity="0.3" stroke-dasharray="2 10"/>
<path d="M1230 -20 C1320 150 1120 300 1280 470 C1370 560 1300 640 1220 700" fill="none" stroke="${p.cyan}" stroke-opacity="${dark ? 0.34 : 0.3}" stroke-width="1.6"/>

<rect width="1600" height="1000" fill="url(#sgb-grid)"/>
<rect x="0" y="352" width="1600" height="260" fill="url(#sgb-dots)" opacity="0.5"/>

<!-- 细字内容：9–11px、300 字重，用来验证玻璃是否保住了可读性 -->
<g font-family="${FONT}" fill="${p.ink}">
  <g fill-opacity="${inkA}">
    <text x="72" y="596" font-size="11" font-weight="300" letter-spacing="0.06em">thin type 11px · 细字可读性测试 sample</text>
    <text x="72" y="616" font-size="10" font-weight="300" letter-spacing="0.04em">随光而变 · 感知环境色自然融合 · 点按有光</text>
    <text x="72" y="634" font-size="9" font-weight="300" letter-spacing="0.02em">alpha 0.68 / blur 16px / saturate 180% / rim 0.42</text>
  </g>
  <g fill-opacity="${inkB}">
    <text x="486" y="614" font-size="10" font-weight="300">the quick brown fox jumps over the lazy dog 0123456789</text>
    <text x="486" y="632" font-size="9" font-weight="300">精细笔画在模糊下是否还站得住 —— 这一行就是判据。</text>
    <text x="486" y="664" font-size="9" font-weight="300" letter-spacing="0.12em">HYPEROS 4 / LIFELIKE AESTHETICS / SOFT GLASS</text>
  </g>
  <g fill-opacity="${inkC}">
    <text x="924" y="600" font-size="9" font-weight="300" letter-spacing="0.08em">0.0412 0.8831 0.2290 0.6614 0.1177 0.9025</text>
    <text x="924" y="620" font-size="9" font-weight="300" letter-spacing="0.08em">LUM 0.62 σ 0.184 EDGE 0.031 BUSY 0.71</text>
    <text x="924" y="640" font-size="9" font-weight="300" letter-spacing="0.08em">A/B compare · C shader · 500ms sample</text>
    <text x="1204" y="470" font-size="10" font-weight="300">柔光玻璃</text>
  </g>
</g>
<g font-family="${FONT}" fill="${p.ink}" fill-opacity="${inkC}">
  <text x="44" y="86" font-size="10" font-weight="300" letter-spacing="0.28em">TEST BACKDROP / A–C</text>
  <text x="1418" y="948" font-size="9" font-weight="300">1600 × 1000 · inline SVG</text>
</g>

<rect width="1600" height="1000" fill="url(#sgb-vignette)"/>
`
}

export function backdropDocument(theme: Theme, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">${backdropMarkup(theme)}</svg>`
}

/**
 * 把底图 SVG 栅格化成一块离屏 canvas。
 * 尺寸取视口 CSS 尺寸（再按 1440 上限缩一档），保证与可见 SVG 的
 * preserveAspectRatio="slice" 裁剪完全一致 —— 采样坐标可以直接用视口坐标。
 */
export async function rasterizeBackdrop(
  theme: Theme,
  vw: number,
  vh: number,
): Promise<HTMLCanvasElement> {
  const doc = backdropDocument(theme, Math.round(vw), Math.round(vh))
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(doc)}`
  const img = new Image()
  img.decoding = 'sync'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('backdrop raster: svg load failed'))
    img.src = url
  })
  const scale = Math.min(1, 1440 / Math.max(vw, vh))
  const out = document.createElement('canvas')
  out.width = Math.max(2, Math.round(vw * scale))
  out.height = Math.max(2, Math.round(vh * scale))
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('backdrop raster: 2d context unavailable')
  ctx.drawImage(img, 0, 0, out.width, out.height)
  return out
}

/* ==================================================================
   采样与推导
   ================================================================== */

let sampleCanvas: HTMLCanvasElement | null = null
const SAMPLE_GRID = 80

/**
 * 采样面板背后区域。核心两步：
 *   1) ctx.drawImage(source, 裁剪矩形 → 80×80) —— GPU 侧缩小，顺便做面积平均
 *   2) getImageData 后算平均色 / 亮度标准差 σ / 相邻亮度差 edge
 *
 * σ 大 = 背后明暗跨度大；edge 大 = 细节密（细字、色块边缘）。
 * 两者合起来就是「内容有多花」。
 */
export function sampleRegion(
  source: HTMLCanvasElement,
  rect: PanelRect,
  vw: number,
  vh: number,
): RegionSample {
  if (!sampleCanvas) {
    sampleCanvas = document.createElement('canvas')
    sampleCanvas.width = SAMPLE_GRID
    sampleCanvas.height = SAMPLE_GRID
  }
  const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('sample: 2d context unavailable')

  const kx = source.width / Math.max(vw, 1)
  const ky = source.height / Math.max(vh, 1)
  const inset = 6
  const left = (rect.left + inset) * kx
  const top = (rect.top + inset) * ky
  const width = Math.max(1, (rect.width - inset * 2) * kx)
  const height = Math.max(1, (rect.height - inset * 2) * ky)
  ctx.clearRect(0, 0, SAMPLE_GRID, SAMPLE_GRID)
  ctx.drawImage(
    source,
    clamp(left, 0, source.width - 1),
    clamp(top, 0, source.height - 1),
    Math.min(width, source.width - left),
    Math.min(height, source.height - top),
    0,
    0,
    SAMPLE_GRID,
    SAMPLE_GRID,
  )
  const data = ctx.getImageData(0, 0, SAMPLE_GRID, SAMPLE_GRID).data

  const lum = new Float32Array(SAMPLE_GRID * SAMPLE_GRID)
  let sr = 0
  let sg = 0
  let sb = 0
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255
    sr += r
    sg += g
    sb += b
    lum[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const n = SAMPLE_GRID * SAMPLE_GRID
  let mean = 0
  for (let i = 0; i < n; i += 1) mean += lum[i]
  mean /= n
  let variance = 0
  for (let i = 0; i < n; i += 1) variance += (lum[i] - mean) ** 2
  const sigma = Math.sqrt(variance / n)

  // 相邻亮度差：横向 + 纵向各算一遍再平均，只取完整行/列
  let edgeSum = 0
  let edgeCount = 0
  for (let y = 0; y < SAMPLE_GRID; y += 1) {
    for (let x = 0; x < SAMPLE_GRID - 1; x += 1) {
      edgeSum += Math.abs(lum[y * SAMPLE_GRID + x] - lum[y * SAMPLE_GRID + x + 1])
      edgeCount += 1
    }
  }
  for (let y = 0; y < SAMPLE_GRID - 1; y += 1) {
    for (let x = 0; x < SAMPLE_GRID; x += 1) {
      edgeSum += Math.abs(lum[y * SAMPLE_GRID + x] - lum[(y + 1) * SAMPLE_GRID + x])
      edgeCount += 1
    }
  }
  const edge = edgeSum / Math.max(edgeCount, 1)

  // 均值色提饱和：大面积平均会把彩色抹成灰，这里拉一档保留环境色
  const avg: [number, number, number] = [sr / n, sg / n, sb / n]
  const mn = Math.min(avg[0], avg[1], avg[2])
  const boost = 1.45
  const rgb: [number, number, number] = [
    clamp(mn + (avg[0] - mn) * boost, 0, 1),
    clamp(mn + (avg[1] - mn) * boost, 0, 1),
    clamp(mn + (avg[2] - mn) * boost, 0, 1),
  ]

  /* 背景复杂度公式（也是「自适应通透度」的输入）：
       σn   = clamp(σ / 0.22, 0, 1)      亮度跨度：0.22 已是极强的明暗对比
       en   = clamp(edge / 0.035, 0, 1)  细节密度：0.035 约等于细字+色块边缘
       busy = clamp(0.62 * σn + 0.38 * en, 0, 1)
     取整到 0.01 作为 key，避免浮点噪声导致每 500ms 都重渲染。 */
  const sigmaN = clamp(sigma / 0.22, 0, 1)
  const edgeN = clamp(edge / 0.035, 0, 1)
  const busy = clamp(0.62 * sigmaN + 0.38 * edgeN, 0, 1)
  const key = [
    Math.round(rgb[0] * 24),
    Math.round(rgb[1] * 24),
    Math.round(rgb[2] * 24),
    Math.round(busy * 100),
    Math.round(rect.width),
  ].join(':')

  return { key, rgb, mean, sigma, edge, busy }
}

/**
 * 参数推导。所有输出都是「面板这一帧的材质值」。
 *
 * 自适应通透度公式：
 *   busy 见 sampleRegion
 *   blurEff  = blurBase * (1 - 0.40 * busy)              // 越花 → 略降模糊
 *   alphaEff = alphaBase + (0.88 - alphaBase) * 0.80 * busy  // 越花 → 提高不透明度
 *   satEff   = 1.72 - 0.34 * busy
 * 关掉自适应时回落到 blurBase / alphaBase / 1.74。
 *
 * 环境色 tint：
 *   tintAlpha = 0.06 + 0.46 * (tint / 100)   （关掉时 0）
 *
 * rim：
 *   coolAlpha = 0.68 * rim/100（左上冷白）
 *   warmAlpha = 0.46 * rim/100（右下暖白）
 */
export function deriveGlass(
  sample: RegionSample | null,
  params: LabParams,
  theme: Theme,
  envOn: boolean,
  adaptiveOn: boolean,
): GlassLook {
  const dark = theme === 'dark'
  const busy = adaptiveOn ? (sample?.busy ?? 0) : 0
  const alphaBase = dark ? 0.3 : 0.32
  const blur = adaptiveOn ? params.blur * (1 - 0.4 * busy) : params.blur
  const alpha = adaptiveOn ? alphaBase + (0.88 - alphaBase) * 0.8 * busy : alphaBase
  const sat = adaptiveOn ? 1.72 - 0.34 * busy : 1.74
  const bright = dark ? 1.02 + 0.05 * (1 - busy) : 1.04 + 0.02 * (1 - busy)
  const tintRgb = envOn && sample ? sample.rgb : null
  const tintAlpha = tintRgb ? 0.06 + 0.46 * (params.tint / 100) : 0
  const rimCool = 0.68 * (params.rim / 100)
  const rimWarm = 0.46 * (params.rim / 100)

  const bg = dark
    ? `rgba(14, 16, 22, ${alpha.toFixed(3)})`
    : `rgba(255, 255, 255, ${alpha.toFixed(3)})`
  const tint = tintRgb
    ? `rgba(${Math.round(tintRgb[0] * 255)}, ${Math.round(tintRgb[1] * 255)}, ${Math.round(
        tintRgb[2] * 255,
      )}, ${tintAlpha.toFixed(3)})`
    : 'rgba(0, 0, 0, 0)'

  return {
    blur,
    alpha,
    sat,
    bright,
    tintRgb,
    tintAlpha,
    rimCool,
    rimWarm,
    busy,
    vars: {
      '--sg-blur': `${blur.toFixed(2)}px`,
      '--sg-alpha': alpha.toFixed(3),
      '--sg-bg': bg,
      '--sg-tint': tint,
      '--sg-sat': sat.toFixed(2),
      '--sg-bright': bright.toFixed(3),
      '--sg-rim-cool': `rgba(196, 228, 255, ${rimCool.toFixed(3)})`,
      '--sg-rim-warm': `rgba(255, 224, 190, ${rimWarm.toFixed(3)})`,
      '--sg-ink': dark ? 'rgba(246, 248, 252, 0.95)' : 'rgba(20, 22, 28, 0.93)',
      '--sg-ink-dim': dark ? 'rgba(226, 232, 244, 0.62)' : 'rgba(32, 36, 44, 0.56)',
      '--sg-ink-fine': dark ? 'rgba(226, 232, 244, 0.5)' : 'rgba(32, 36, 44, 0.44)',
      '--sg-line': dark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(18, 24, 36, 0.12)',
    },
  }
}

/** 复制 A 的 CSS：把当前参数导成可粘贴的一段声明 */
export function exportCssA(look: GlassLook, theme: Theme, params: LabParams): string {
  const dark = theme === 'dark'
  const tint = look.tintRgb
    ? `rgba(${Math.round(look.tintRgb[0] * 255)}, ${Math.round(look.tintRgb[1] * 255)}, ${Math.round(
        look.tintRgb[2] * 255,
      )}, ${look.tintAlpha.toFixed(3)})`
    : 'transparent'
  const base = dark ? `rgba(14, 16, 22, ${look.alpha.toFixed(3)})` : `rgba(255, 255, 255, ${look.alpha.toFixed(3)})`
  const r = (v: number) => v.toFixed(3)
  return `/* 柔光玻璃 A · 纯 CSS —— 由 SoftGlassLab 导出（blur ${params.blur}px / tint ${params.tint}% / rim ${params.rim}%） */
.sg-glass-a {
  border-radius: 26px;
  -webkit-backdrop-filter: blur(${look.blur.toFixed(2)}px) saturate(${look.sat.toFixed(2)}) brightness(${look.bright.toFixed(3)});
  backdrop-filter: blur(${look.blur.toFixed(2)}px) saturate(${look.sat.toFixed(2)}) brightness(${look.bright.toFixed(3)});
  background-color: ${base};
  background-image: linear-gradient(${tint}, ${tint});
  box-shadow:
    inset 0 1px 0.5px rgba(196, 228, 255, ${r(look.rimCool)}),
    inset 0 18px 34px -22px rgba(196, 228, 255, ${r(look.rimCool)}),
    inset 0 -1px 0.5px rgba(255, 224, 190, ${r(look.rimWarm)}),
    inset 0 -20px 36px -24px rgba(255, 224, 190, ${r(look.rimWarm)}),
    0 26px 60px -30px rgba(0, 0, 0, 0.45);
}
`
}