import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import {
  backdropMarkup,
  deriveGlass,
  exportCssA,
  rasterizeBackdrop,
  sampleRegion,
  type GlassLook,
  type LabParams,
  type RegionSample,
  type Theme,
} from '../components/labs/softglass-common'
import { createSoftGlassRenderer, type RendererStatus, type SoftGlassRenderer } from '../components/labs/softglass-webgl'

/* ==================================================================
   柔光玻璃实验室 /labs/softglass
   三种网页实现并排对照。只在本页内生效，不触碰任何现有组件与全局样式。
   ================================================================== */

type PanelKey = 'a' | 'b' | 'c'

const SAMPLING_INTERVAL_MS = 500

/* B 方案能力探测：CSS 语法接受 `backdrop-filter: url(#id)` 不代表合成器
   真的执行 SVG 滤镜（Chromium 长期不支持 backdrop-filter 里的 url()）。
   这里先按 CSS.supports 判定，页面会同时把「本机是否真的渲染」的实测结论
   写在面板脚注里。 */
function supportsUrlBackdrop(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return (
    CSS.supports('backdrop-filter', 'url(#sg-refract)') ||
    CSS.supports('-webkit-backdrop-filter', 'url(#sg-refract)')
  )
}

/* 实测结论（本机 ego-browser Chromium，1291×779，2026-11-17）：
   CSS.supports('backdrop-filter','url(#sg-refract)') 返回 true，但合成器并不执行它。
   同一面板「带 url()」与「临时改成纯 blur()」两张 1:1 截图的逐像素差最大只有 3/255
   （>2 的像素 8/159984），而 feDisplacementMap scale=22 若真生效，网格线会明显错位，
   差值不可能这么小 —— 因此判定本机忽略 url()。
   代码保留（CSS 里的 url() 不删），以便在真正支持的浏览器（Safari 等）里生效；
   本机在面板上加「本机不支持」标注，视觉回落到 A 的材质。 */
const URL_BACKDROP_RENDERS_HERE = false

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(readTheme)
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return theme
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** 整页帧率：用 rAF 计数，每 500ms 汇总一次。reduced-motion 下只读不动画。 */
function usePageFps(): number {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let raf = 0
    let frames = 0
    let mark = 0
    let alive = true
    const loop = (t: number) => {
      if (!alive) return
      frames += 1
      if (mark === 0) mark = t
      else if (t - mark >= 500) {
        setFps(Math.round((frames * 1000) / (t - mark)))
        frames = 0
        mark = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [])
  return fps
}

interface GlowPoint {
  x: number
  y: number
  t: number
}

/**
 * 点按 / 拖拽光效。画在每块面板自己的 2D canvas 上，加法混合（lighter）：
 *   · 按下：radial 光斑，半径按阻尼弹簧 r(t) = R·(1 − e^(−t/90)·cos(t/110)) 张开，
 *     亮度按 e^(−t/600) 衰减；
 *   · 拖动：轨迹点串成光带，按 age/860ms 二次方衰减，冷暖双色叠一层；
 *   · 没有按下且轨迹衰减完就停掉 rAF，不空转。
 */
function useGlowLayer(
  hostRef: RefObject<HTMLElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  reduced: boolean,
): void {
  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas || !enabled || reduced) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let alive = true
    let pressing = false
    let pressStart = 0
    let press = { x: 0, y: 0 }
    let trail: GlowPoint[] = []
    let dpr = 1
    let width = 0
    let height = 0

    const resize = () => {
      const rect = host.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(2, Math.round(width * dpr))
      canvas.height = Math.max(2, Math.round(height * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    const draw = (now: number) => {
      if (!alive) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      const life = 860
      trail = trail.filter((p) => now - p.t < life)
      for (let i = 1; i < trail.length; i += 1) {
        const from = trail[i - 1]
        const to = trail[i]
        const alpha = Math.pow(Math.max(0, 1 - (now - to.t) / life), 2) * 0.6
        if (alpha <= 0.005) continue
        ctx.lineCap = 'round'
        ctx.strokeStyle = `rgba(186, 216, 255, ${alpha.toFixed(3)})`
        ctx.lineWidth = 26 * (0.4 + alpha)
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
        ctx.strokeStyle = `rgba(255, 214, 176, ${(alpha * 0.5).toFixed(3)})`
        ctx.lineWidth = 8 * (0.4 + alpha)
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
      }

      if (pressing) {
        const age = now - pressStart
        const r = 104 * (1 - Math.exp(-age / 90) * Math.cos(age / 110))
        const fade = Math.exp(-age / 600)
        const glow = ctx.createRadialGradient(press.x, press.y, 0, press.x, press.y, Math.max(r, 1))
        glow.addColorStop(0, `rgba(255, 255, 255, ${(0.92 * fade).toFixed(3)})`)
        glow.addColorStop(0.34, `rgba(206, 230, 255, ${(0.6 * fade).toFixed(3)})`)
        glow.addColorStop(0.68, `rgba(158, 198, 255, ${(0.26 * fade).toFixed(3)})`)
        glow.addColorStop(1, 'rgba(120, 170, 255, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(press.x, press.y, Math.max(r, 1), 0, Math.PI * 2)
        ctx.fill()
      }

      if (!pressing && trail.length === 0) {
        ctx.clearRect(0, 0, width, height)
        raf = 0
        return
      }
      raf = requestAnimationFrame(draw)
    }

    const ensureLoop = () => {
      if (raf === 0 && alive) raf = requestAnimationFrame(draw)
    }

    const localPoint = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const now = performance.now()
      pressing = true
      pressStart = now
      press = localPoint(event)
      trail = [{ ...press, t: now }]
      try {
        host.setPointerCapture(event.pointerId)
      } catch {
        /* pointer capture 不可用时依旧能用冒泡事件绘制 */
      }
      ensureLoop()
    }

    const onMove = (event: PointerEvent) => {
      if (!pressing) return
      const now = performance.now()
      const point = localPoint(event)
      const last = trail[trail.length - 1]
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 3 || now - last.t > 24) {
        trail.push({ ...point, t: now })
        if (trail.length > 120) trail.shift()
      }
      press = point
      ensureLoop()
    }

    const onUp = (event: PointerEvent) => {
      if (!pressing) return
      pressing = false
      try {
        host.releasePointerCapture(event.pointerId)
      } catch {
        /* 同上 */
      }
      const now = performance.now()
      trail.push({ ...localPoint(event), t: now })
      ensureLoop()
    }

    host.addEventListener('pointerdown', onDown)
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerup', onUp)
    host.addEventListener('pointercancel', onUp)
    host.addEventListener('pointerleave', onUp)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerup', onUp)
      host.removeEventListener('pointercancel', onUp)
      host.removeEventListener('pointerleave', onUp)
      ctx.clearRect(0, 0, width, height)
    }
  }, [hostRef, canvasRef, enabled, reduced])
}

function varsStyle(vars: Record<string, string>): CSSProperties {
  return vars as unknown as CSSProperties
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* 非安全上下文 / 无权限时走 execCommand 回退 */
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

const STYLE = `
.sg-page {
  position: relative;
  min-height: 100vh;
  box-sizing: border-box;
  padding: clamp(14px, 2vw, 24px) clamp(14px, 2vw, 28px) 20px;
  overflow-x: clip;
  color: var(--sg-page-ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.sg-backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  z-index: 0;
}
.sg-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
.sg-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1700px;
  margin: 0 auto;
}

/* ---------- 头部与控制条 ---------- */
.sg-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.sg-head-main { min-width: 0; flex: 1 1 320px; }
.sg-eyebrow {
  margin: 0 0 5px;
  font-size: 9.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sg-page-dim);
}
.sg-title {
  margin: 0;
  font-size: clamp(18px, 2.2vw, 25px);
  font-weight: 650;
  letter-spacing: 0.01em;
  line-height: 1.25;
}
.sg-sub {
  margin: 6px 0 0;
  max-width: 62ch;
  font-size: 11px;
  line-height: 1.62;
  color: var(--sg-page-dim);
}
.sg-controls {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 16px;
  border: 1px solid var(--sg-page-line);
  background: var(--sg-page-chip);
  -webkit-backdrop-filter: blur(14px) saturate(1.35);
  backdrop-filter: blur(14px) saturate(1.35);
  box-shadow: 0 18px 40px -30px rgba(0, 0, 0, 0.55);
}
.sg-toggles { display: flex; gap: 6px; flex-wrap: wrap; }
.sg-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid var(--sg-page-line);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 10.5px;
  line-height: 1.3;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.sg-toggle[aria-pressed='true'] {
  background: var(--sg-toggle-on);
  border-color: var(--sg-toggle-on-line);
}
.sg-toggle:focus-visible { outline: 2px solid var(--sg-accent); outline-offset: 2px; }
.sg-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.3;
  flex: none;
}
.sg-toggle[aria-pressed='true'] .sg-dot { opacity: 0.95; }
.sg-sliders { display: flex; gap: 10px 14px; flex-wrap: wrap; align-items: center; }
.sg-slider {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--sg-page-dim);
  white-space: nowrap;
}
.sg-slider input {
  width: 88px;
  height: 14px;
  accent-color: var(--sg-accent);
  cursor: pointer;
}
.sg-slider b {
  min-width: 34px;
  text-align: right;
  font-size: 10px;
  font-weight: 650;
  color: var(--sg-page-ink);
  font-variant-numeric: tabular-nums;
}

/* ---------- 面板网格 ---------- */
.sg-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}
@media (max-width: 900px) {
  .sg-grid { grid-template-columns: 1fr; }
}

.sg-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 396px;
  padding: 15px 15px 11px;
  border-radius: 26px;
  overflow: hidden;
  isolation: isolate;
  color: var(--sg-ink);
  background-color: var(--sg-bg);
  /* 第一层是环境色 tint，第二层是 1% 噪点（内联 base64 PNG，24px 平铺） */
  background-image:
    linear-gradient(var(--sg-tint), var(--sg-tint)),
    var(--glass-noise);
  background-size: auto, 24px 24px;
  background-repeat: repeat, repeat;
  box-shadow:
    inset 0 1px 0.5px var(--sg-rim-cool),
    inset 0 18px 34px -22px var(--sg-rim-cool),
    inset 0 -1px 0.5px var(--sg-rim-warm),
    inset 0 -20px 36px -24px var(--sg-rim-warm),
    0 26px 60px -30px rgba(0, 0, 0, 0.45);
}
/* A 的材质：三块面板的公共底子（B 的降级、C 的降级都复用它） */
.sg-glass {
  -webkit-backdrop-filter: blur(var(--sg-blur)) saturate(var(--sg-sat)) brightness(var(--sg-bright));
  backdrop-filter: blur(var(--sg-blur)) saturate(var(--sg-sat)) brightness(var(--sg-bright));
}
/* B 在有能力的浏览器上额外叠一层 SVG 位移折射滤镜 */
.sg-glass-b:not(.sg-glass-b-down) {
  -webkit-backdrop-filter: url(#sg-refract) blur(var(--sg-blur)) saturate(var(--sg-sat))
    brightness(var(--sg-bright));
  backdrop-filter: url(#sg-refract) blur(var(--sg-blur)) saturate(var(--sg-sat))
    brightness(var(--sg-bright));
}
/* C 的 WebGL canvas 自己合成整块玻璃，禁用 CSS 玻璃避免叠两层 */
.sg-glass-c.sg-c-live {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  background-color: transparent;
  background-image: none;
}

.sg-panel-body {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.sg-panel-head { display: flex; align-items: center; gap: 8px; }
.sg-badge {
  width: 25px;
  height: 25px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 9px;
  border: 1px solid var(--sg-line);
  background: var(--sg-chip-fill);
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
}
.sg-panel-name { font-size: 12px; font-weight: 650; letter-spacing: 0.01em; }
.sg-flag {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--sg-flag-line);
  color: var(--sg-flag);
  font-size: 10.5px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.sg-tag {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--sg-line);
  font-size: 9px;
  color: var(--sg-ink-fine);
  white-space: nowrap;
}
.sg-panel-title {
  margin: 10px 0 0;
  font-size: 16.5px;
  font-weight: 650;
  letter-spacing: 0.01em;
  line-height: 1.3;
}
.sg-panel-copy {
  margin: 5px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--sg-ink-dim);
}
.sg-panel-fine {
  margin: 8px 0 0;
  font-size: 9.5px;
  line-height: 1.66;
  color: var(--sg-ink-fine);
}
.sg-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.sg-chip {
  padding: 2.5px 7px;
  border-radius: 999px;
  border: 1px solid var(--sg-line);
  background: var(--sg-chip-fill);
  font-size: 9px;
  color: var(--sg-ink-dim);
  white-space: nowrap;
}
.sg-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--sg-line);
  font-size: 9px;
  color: var(--sg-ink-fine);
  font-variant-numeric: tabular-nums;
}
.sg-fps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 5px;
  font-size: 9px;
  color: var(--sg-ink-fine);
}
.sg-fps b { font-weight: 650; color: var(--sg-ink-dim); font-variant-numeric: tabular-nums; }
.sg-note {
  margin: 6px 0 0;
  font-size: 9px;
  line-height: 1.5;
  color: var(--sg-ink-fine);
  border-left: 2px solid var(--sg-rim-warm);
  padding-left: 6px;
}
.sg-glow {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  border-radius: inherit;
}
.sg-webgl-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  border-radius: inherit;
}

/* ---------- 页脚 ---------- */
.sg-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  flex-wrap: wrap;
  font-size: 10.5px;
  color: var(--sg-page-dim);
}
.sg-foot-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sg-foot b { color: var(--sg-page-ink); font-variant-numeric: tabular-nums; }
.sg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--sg-page-line);
  background: var(--sg-page-chip);
  color: var(--sg-page-ink);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}
.sg-btn:hover { border-color: var(--sg-toggle-on-line); }
.sg-btn:focus-visible { outline: 2px solid var(--sg-accent); outline-offset: 2px; }
.sg-hint {
  font-size: 10px;
  color: var(--sg-accent);
  transition: opacity 160ms ease;
}

@media (max-width: 560px) {
  .sg-head { align-items: stretch; }
  .sg-controls { width: 100%; }
  .sg-slider { flex: 1 1 130px; }
  .sg-slider input { width: 100%; min-width: 64px; }
  .sg-panel { min-height: 360px; padding: 13px 13px 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .sg-page *,
  .sg-page *::before,
  .sg-page *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
`

interface GlassContentProps {
  letter: string
  name: string
  tag: string
  look: GlassLook
  fps: string
  note?: string
  warn?: string
}

function GlassContent({ letter, name, tag, look, fps, note, warn }: GlassContentProps) {
  return (
    <div className="sg-panel-body">
      <div className="sg-panel-head">
        <span className="sg-badge">{letter}</span>
        <span className="sg-panel-name">{name}</span>
        {warn ? <span className="sg-flag">{warn}</span> : null}
        <span className="sg-tag">{tag}</span>
      </div>
      <h2 className="sg-panel-title">柔光玻璃 · 对照面板</h2>
      <p className="sg-panel-copy">随光而变，感知环境色自然融合；点按有光、拖拽有光，光效跟着轨迹流动。</p>
      <p className="sg-panel-fine">
        这一行是 9.5px 细字，专门验「感知内容自适应通透度」：内容越复杂越通透（但提高不透明度保证可读）。
        若边缘发胀、字口糊在一起，说明这一档的通透度给多了。
      </p>
      <div className="sg-chips">
        <span className="sg-chip">环境色</span>
        <span className="sg-chip">自适应通透</span>
        <span className="sg-chip">点按光效</span>
      </div>
      <div className="sg-stats">
        <span>busy {look.busy.toFixed(2)}</span>
        <span>blur {look.blur.toFixed(1)}px</span>
        <span>α {look.alpha.toFixed(2)}</span>
      </div>
      <div className="sg-fps">
        <span>帧率</span>
        <b>{fps}</b>
      </div>
      {note ? <p className="sg-note">{note}</p> : null}
    </div>
  )
}

export default function SoftGlassLab() {
  const theme = useTheme()
  const reduced = useReducedMotion()
  const pageFps = usePageFps()

  const [params, setParams] = useState<LabParams>({ blur: 18, tint: 62, rim: 60 })
  const [envOn, setEnvOn] = useState(true)
  const [adaptiveOn, setAdaptiveOn] = useState(true)
  const [glowOn, setGlowOn] = useState(true)

  const [scene, setScene] = useState<HTMLCanvasElement | null>(null)
  const [samples, setSamples] = useState<Record<PanelKey, RegionSample | null>>({
    a: null,
    b: null,
    c: null,
  })

  const [cFps, setCFps] = useState(-1)
  const [cStatus, setCStatus] = useState<RendererStatus>('ok')
  const [cDetail, setCDetail] = useState('')

  const [bUrlSupported, setBUrlSupported] = useState<boolean | null>(null)
  const [copyHint, setCopyHint] = useState('')
  const copyTimer = useRef<number>(0)

  const panelA = useRef<HTMLElement | null>(null)
  const panelB = useRef<HTMLElement | null>(null)
  const panelC = useRef<HTMLElement | null>(null)
  const glowA = useRef<HTMLCanvasElement | null>(null)
  const glowB = useRef<HTMLCanvasElement | null>(null)
  const glowC = useRef<HTMLCanvasElement | null>(null)
  const hostC = useRef<HTMLElement | null>(null)
  const rendererRef = useRef<SoftGlassRenderer | null>(null)
  const samplesRef = useRef(samples)

  useEffect(() => {
    samplesRef.current = samples
  }, [samples])

  const panelRefs = useMemo(
    () => ({ a: panelA, b: panelB, c: panelC }),
    [],
  )

  /* 主题跟随站点。底图、采样源、渲染器参数都随之更新。 */
  useEffect(() => {
    let cancelled = false
    let timer = 0
    const build = () => {
      rasterizeBackdrop(theme, Math.max(1, window.innerWidth), Math.max(1, window.innerHeight))
        .then((canvas) => {
          if (!cancelled) setScene(canvas)
        })
        .catch(() => {
          if (!cancelled) setScene(null)
        })
    }
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(build, 260)
    }
    build()
    window.addEventListener('resize', schedule)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener('resize', schedule)
    }
  }, [theme])

  useEffect(() => {
    setBUrlSupported(supportsUrlBackdrop())
  }, [])

  /* 环境色 / 自适应通透度采样：每 500ms 一次（不是每帧），
     用 canvas.drawImage 把面板矩形裁剪后缩到 80×80 再读像素。 */
  useEffect(() => {
    if (!scene || (!envOn && !adaptiveOn)) {
      setSamples({ a: null, b: null, c: null })
      return
    }
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      const vw = Math.max(1, window.innerWidth)
      const vh = Math.max(1, window.innerHeight)
      const next: Record<PanelKey, RegionSample | null> = { a: null, b: null, c: null }
      const prev = samplesRef.current
      let changed = false
      ;(['a', 'b', 'c'] as PanelKey[]).forEach((key) => {
        const el = panelRefs[key].current
        if (!el) return
        const rect = el.getBoundingClientRect()
        if (rect.width < 2 || rect.height < 2) return
        try {
          const sample = sampleRegion(
            scene,
            { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            vw,
            vh,
          )
          next[key] = sample
          if (!prev[key] || prev[key]?.key !== sample.key) changed = true
        } catch {
          /* 采样失败时保持上一帧，不影响玻璃本体 */
          next[key] = prev[key]
        }
      })
      if (changed) setSamples(next)
    }
    tick()
    const id = window.setInterval(tick, SAMPLING_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [scene, envOn, adaptiveOn, panelRefs])

  const looks = useMemo(
    () => ({
      a: deriveGlass(samples.a, params, theme, envOn, adaptiveOn),
      b: deriveGlass(samples.b, params, theme, envOn, adaptiveOn),
      c: deriveGlass(samples.c, params, theme, envOn, adaptiveOn),
    }),
    [samples, params, theme, envOn, adaptiveOn],
  )

  useGlowLayer(panelA, glowA, glowOn, reduced)
  useGlowLayer(panelB, glowB, glowOn, reduced)
  useGlowLayer(hostC, glowC, glowOn, reduced)

  /* C 方案的 WebGL 渲染器。canvas 由渲染器自己创建/销毁，
     StrictMode 双挂载也不会残留上下文。 */
  useEffect(() => {
    const host = hostC.current
    if (!host) return
    const renderer = createSoftGlassRenderer({
      host,
      onFps: setCFps,
      onStatus: (status, detail) => {
        setCStatus(status)
        if (status !== 'ok') setCFps(-1)
        if (detail) setCDetail(detail)
      },
    })
    rendererRef.current = renderer
    if (!renderer) setCStatus('unavailable')
    return () => {
      renderer?.destroy()
      rendererRef.current = null
    }
  }, [])

  const rendererParams = useMemo(
    () => ({
      blur: looks.c.blur,
      alpha: looks.c.alpha,
      sat: looks.c.sat,
      bright: looks.c.bright,
      tint: (looks.c.tintRgb ?? [0.56, 0.6, 0.66]) as [number, number, number],
      tintAmt: looks.c.tintAlpha,
      rim: params.rim / 100,
      theme,
      radius: 26,
      bevel: 22,
    }),
    [looks.c, params.rim, theme],
  )

  useEffect(() => {
    rendererRef.current?.setParams(rendererParams)
  }, [rendererParams])

  useEffect(() => {
    if (!scene) return
    rendererRef.current?.setScene({
      source: scene,
      vw: Math.max(1, window.innerWidth),
      vh: Math.max(1, window.innerHeight),
    })
  }, [scene])

  useEffect(() => {
    rendererRef.current?.setReducedMotion(reduced)
  }, [reduced])

  const pageVars = useMemo(
    () => ({
      '--sg-page-ink': theme === 'dark' ? 'rgba(240, 244, 250, 0.96)' : 'rgba(14, 18, 26, 0.92)',
      '--sg-page-dim': theme === 'dark' ? 'rgba(214, 222, 236, 0.64)' : 'rgba(26, 32, 42, 0.6)',
      '--sg-page-line': theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(16, 24, 38, 0.14)',
      '--sg-page-chip': theme === 'dark' ? 'rgba(16, 20, 29, 0.58)' : 'rgba(255, 255, 255, 0.6)',
      '--sg-toggle-on': theme === 'dark' ? 'rgba(126, 178, 255, 0.24)' : 'rgba(58, 112, 214, 0.14)',
      '--sg-toggle-on-line':
        theme === 'dark' ? 'rgba(150, 192, 255, 0.55)' : 'rgba(58, 112, 214, 0.45)',
      '--sg-accent': theme === 'dark' ? '#9cc4ff' : '#2f6fd0',
      '--sg-flag': theme === 'dark' ? 'rgba(255, 186, 156, 0.95)' : 'rgba(176, 68, 38, 0.95)',
      '--sg-flag-line': theme === 'dark' ? 'rgba(255, 172, 138, 0.5)' : 'rgba(196, 92, 54, 0.45)',
    }),
    [theme],
  )

  const onCopy = async () => {
    const css = exportCssA(looks.a, theme, params)
    const ok = await copyText(css)
    setCopyHint(ok ? '已复制 A 的 CSS' : '复制失败，请手动选择')
    window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopyHint(''), 1600)
  }

  const bDown = bUrlSupported === false
  const cLive = cStatus === 'ok'

  return (
    <div className="sg-page" style={varsStyle(pageVars)}>
      <style>{STYLE}</style>
      <svg
        className="sg-backdrop"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: backdropMarkup(theme) }}
      />
      <svg className="sg-defs" aria-hidden="true" focusable="false">
        <defs>
          {/* B 方案：湍流噪点 → 模糊 → 位移，配 backdrop-filter: url(#sg-refract) 做边缘折射 */}
          <filter id="sg-refract" x="-12%" y="-12%" width="124%" height="136%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.013 0.019" numOctaves="2" seed="11" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="1.35" result="softNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="softNoise"
              scale="22"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className="sg-content">
        <header className="sg-head">
          <div className="sg-head-main">
            <p className="sg-eyebrow">Soft Glass Lab · 网页材质对照</p>
            <h1 className="sg-title">柔光玻璃 · 三方案并排</h1>
            <p className="sg-sub">
              小米 HyperOS 4「生命感美学」的柔光玻璃讲的是随光而变、环境色融合、点按有光。
              网页只能自己模拟：这里把 A 纯 CSS、B CSS + SVG 折射、C WebGL shader 放在同一块测试底图上对比。
            </p>
          </div>
          <div className="sg-controls" role="group" aria-label="柔光玻璃参数">
            <div className="sg-toggles">
              <button
                type="button"
                className="sg-toggle"
                aria-pressed={envOn}
                onClick={() => setEnvOn((v) => !v)}
              >
                <span className="sg-dot" />
                环境色感知
              </button>
              <button
                type="button"
                className="sg-toggle"
                aria-pressed={adaptiveOn}
                onClick={() => setAdaptiveOn((v) => !v)}
              >
                <span className="sg-dot" />
                自适应通透度
              </button>
              <button
                type="button"
                className="sg-toggle"
                aria-pressed={glowOn}
                onClick={() => setGlowOn((v) => !v)}
              >
                <span className="sg-dot" />
                点按光效
              </button>
            </div>
            <div className="sg-sliders">
              <label className="sg-slider">
                模糊
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={1}
                  value={params.blur}
                  onChange={(e) => setParams((p) => ({ ...p, blur: Number(e.target.value) }))}
                />
                <b>{params.blur}px</b>
              </label>
              <label className="sg-slider">
                tint
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={params.tint}
                  onChange={(e) => setParams((p) => ({ ...p, tint: Number(e.target.value) }))}
                />
                <b>{params.tint}%</b>
              </label>
              <label className="sg-slider">
                rim
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={params.rim}
                  onChange={(e) => setParams((p) => ({ ...p, rim: Number(e.target.value) }))}
                />
                <b>{params.rim}%</b>
              </label>
            </div>
          </div>
        </header>

        <div className="sg-grid">
          <section
            ref={panelA}
            className="sg-panel sg-glass sg-glass-a"
            style={varsStyle(looks.a.vars)}
            aria-label="A 纯 CSS 柔光玻璃"
          >
            <GlassContent letter="A" name="纯 CSS 柔光" tag="backdrop-filter" look={looks.a} fps="CSS，无每帧成本" />
            <canvas ref={glowA} className="sg-glow" aria-hidden="true" />
          </section>

          <section
            ref={panelB}
            className={`sg-panel sg-glass sg-glass-b${bDown ? ' sg-glass-b-down' : ''}`}
            style={varsStyle(looks.b.vars)}
            aria-label="B CSS 加 SVG 折射"
          >
            <GlassContent
              letter="B"
              name="CSS + SVG 折射"
              tag="url(#sg-refract)"
              look={looks.b}
              fps="CSS，无每帧成本"
              warn={!bDown && !URL_BACKDROP_RENDERS_HERE ? '本机不支持' : undefined}
              note={
                bDown
                  ? '本机完全不接受 backdrop-filter: url()，已自动回退 A 的材质（代码保留）。'
                  : URL_BACKDROP_RENDERS_HERE
                    ? 'feTurbulence + feDisplacementMap 叠在 blur 之上，边缘位移折射已生效。'
                    : '实测本机 Chromium 忽略 backdrop-filter 里的 url()：与去掉 url 的截图逐像素差 ≤3/255，外观 ≈ A。CSS 代码保留，Safari 等可能生效。'
              }
            />
            <canvas ref={glowB} className="sg-glow" aria-hidden="true" />
          </section>

          <section
            ref={(node) => {
              panelC.current = node
              hostC.current = node
            }}
            className={`sg-panel sg-glass sg-glass-c${cLive ? ' sg-c-live' : ''}`}
            style={varsStyle(looks.c.vars)}
            aria-label="C WebGL shader 柔光玻璃"
          >
            <GlassContent
              letter="C"
              name="WebGL 全 shader"
              tag="canvas · GLSL"
              look={looks.c}
              fps={
                cStatus !== 'ok'
                  ? '—'
                  : cFps < 0
                    ? reduced
                      ? '静态（reduced-motion）'
                      : '待测'
                    : `${cFps} fps（rAF 自测）`
              }
              note={
                cStatus === 'unavailable'
                  ? `WebGL 不可用（${cDetail || 'WebGL2 初始化失败'}），已回退 A 的 CSS 材质。`
                  : cStatus === 'lost'
                    ? 'WebGL 上下文丢失，正在等待恢复；期间用 A 的 CSS 材质兜底。'
                    : '倒角 SDF + 边缘折射 + 轻微色散 + 环境色 tint + 磨砂，预乘输出。'
              }
            />
            <canvas ref={glowC} className="sg-glow" aria-hidden="true" />
          </section>
        </div>

        <footer className="sg-foot">
          <div className="sg-foot-info">
            <span>
              整页帧率 <b>{pageFps > 0 ? `${pageFps} fps` : '—'}</b>
            </span>
            <span>·</span>
            <span>环境色 / 通透度每 500ms 采样一次（canvas.drawImage）</span>
            <span>·</span>
            <span>主题跟随站点：{theme === 'dark' ? '深色' : '浅色'}</span>
            {reduced ? (
              <>
                <span>·</span>
                <span>reduced-motion：光效与循环动画已停</span>
              </>
            ) : null}
          </div>
          <div className="sg-foot-info">
            <span className="sg-hint" role="status" aria-live="polite">
              {copyHint}
            </span>
            <button type="button" className="sg-btn" onClick={onCopy}>
              复制 A 的 CSS
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}