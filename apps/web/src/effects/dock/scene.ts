/**
 * 桌面 Dock —— 十秒循环的纯函数场景。
 *
 * 只有一个入口 `render(ctx, t, params)`：所有会动的元素都从 t 现算，
 * 不保留上一帧状态，所以可以随意跳帧、倒放、录屏、截图。
 *
 * 画布按 1080×1350 设计，舞台再等比缩放到页面里。
 */

export const DOCK_W = 1080
export const DOCK_H = 1350
export const DURATION = 10

export interface DockParams {
  /** 光标放大强度，0 就完全不放大 */
  magnify: number
  /** 图标基础尺寸 */
  iconScale: number
  /** 背景光晕强度 */
  glow: number
  /** 是否显示悬浮标签 */
  label: boolean
  /** 深色桌面 */
  dark: boolean
}

export const DEFAULT_PARAMS: DockParams = {
  magnify: 1,
  iconScale: 1,
  glow: 1,
  label: true,
  dark: false,
}

type Ctx = CanvasRenderingContext2D
type Cursor = { x: number; y: number }

const CX = DOCK_W / 2
const CY = 820
const DOCK_W_BASE = 780
const DOCK_H_BASE = 196
const ICON = 116
const GAP = 26
const ICON_OFFS = [-2, -1, 0, 1, 2].map((i) => i * (ICON + GAP))
const NAMES = ['Files', 'Messages', 'Music', 'Photos', 'Calendar']
const COLORS = ['#3f8cff', '#ff7a59', '#8b5cf6', '#e8a33d', '#34b27b']

/* 时间节点：先悬停扫一遍，再依次点开 */
const CLICK = [2.6, 3.7, 4.6, 5.3, 6.9]
const SEND_AT = 6.1
const BLUR_OUT = 8.15
const FOLD_AT = 9.12

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const c01 = (x: number) => clamp(x, 0, 1)
const smooth = (a: number, b: number, x: number) => {
  const p = c01((x - a) / (b - a))
  return p * p * (3 - 2 * p)
}
const easeOut = (x: number) => 1 - Math.pow(1 - c01(x), 3)
const easeIn = (x: number) => Math.pow(c01(x), 3)
const easeBack = (x: number) => {
  const p = c01(x)
  const s = 1.70158
  return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2)
}
const rand = (i: number) => {
  const x = Math.sin(i * 91.13 + 17.7) * 43758.5453
  return x - Math.floor(x)
}

/* ------------------------------------------------------------------ */
/* 光标：关键帧之间用 smoothstep 走，停顿时自然减速                      */
/* ------------------------------------------------------------------ */
const PATH: { t: number; x: number; y: number }[] = [
  { t: 0.5, x: 980, y: 1240 },
  { t: 1.2, x: 820, y: 1010 },
  { t: 2.15, x: 264, y: 782 },
  { t: 2.9, x: 264, y: 776 },
  { t: 3.55, x: 402, y: 772 },
  { t: 4.25, x: 402, y: 770 },
  { t: 4.5, x: 540, y: 770 },
  { t: 5.25, x: 540, y: 768 },
  { t: 5.55, x: 682, y: 766 },
  { t: 6.0, x: 402, y: 766 },
  { t: 6.55, x: 402, y: 764 },
  { t: 6.85, x: 676, y: 764 },
  { t: 7.35, x: 824, y: 764 },
  { t: 7.95, x: 930, y: 860 },
  { t: 9.2, x: 990, y: 1240 },
]

function cursorAt(t: number): Cursor {
  if (t <= PATH[0].t) return { x: PATH[0].x, y: PATH[0].y }
  for (let i = 1; i < PATH.length; i++) {
    const a = PATH[i - 1]
    const b = PATH[i]
    if (t <= b.t) {
      const p = smooth(a.t, b.t, t)
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p }
    }
  }
  const last = PATH[PATH.length - 1]
  return { x: last.x, y: last.y }
}

/* ------------------------------------------------------------------ */
/* 图标位置 / 放大                                                     */
/* ------------------------------------------------------------------ */
function iconScreenX(i: number, spread: number): number {
  return CX + ICON_OFFS[i] * spread
}

function iconGeom(i: number, cursor: Cursor, spread: number, magnify: number) {
  const ix = iconScreenX(i, spread)
  const dx = cursor.x - ix
  const dy = cursor.y - CY
  const d2 = (dx / 205) * (dx / 205) + (dy / 170) * (dy / 170)
  const g = Math.exp(-d2 * 1.65) * magnify
  return { ix, dx, dy, g: clamp(g, 0, 1.35) }
}

/* ------------------------------------------------------------------ */
/* 圆角矩形                                                            */
/* ------------------------------------------------------------------ */
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.lineTo(x + w - rad, y)
  ctx.arcTo(x + w, y, x + w, y + rad, rad)
  ctx.lineTo(x + w, y + h - rad)
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad)
  ctx.lineTo(x + rad, y + h)
  ctx.arcTo(x, y + h, x, y + h - rad, rad)
  ctx.lineTo(x, y + rad)
  ctx.arcTo(x, y, x + rad, y, rad)
  ctx.closePath()
}

function ellipseShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry))
  g.addColorStop(0, `rgba(24, 30, 48, ${a})`)
  g.addColorStop(1, 'rgba(24, 30, 48, 0)')
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  ctx.translate(-x, -y)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* 背景                                                                */
/* ------------------------------------------------------------------ */
function drawBackground(ctx: Ctx, t: number, p: DockParams) {
  const dark = p.dark
  const bg = ctx.createLinearGradient(0, 0, 0, DOCK_H)
  if (dark) {
    bg.addColorStop(0, '#0c0c10')
    bg.addColorStop(0.5, '#131319')
    bg.addColorStop(1, '#1c1c24')
  } else {
    bg.addColorStop(0, '#fbfbfd')
    bg.addColorStop(0.5, '#f2f2f7')
    bg.addColorStop(1, '#e5e5ed')
  }
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, DOCK_W, DOCK_H)

  const warm = ctx.createRadialGradient(880, 170, 0, 880, 170, 520)
  warm.addColorStop(
    0,
    dark ? `rgba(255, 184, 120, ${0.2 * p.glow})` : `rgba(255, 214, 162, ${0.36 * p.glow})`,
  )
  warm.addColorStop(
    0.55,
    dark ? `rgba(255, 184, 120, ${0.07 * p.glow})` : `rgba(255, 220, 178, ${0.12 * p.glow})`,
  )
  warm.addColorStop(1, 'rgba(255, 220, 178, 0)')
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, DOCK_W, DOCK_H)

  const cool = ctx.createRadialGradient(120, 1080, 0, 120, 1080, 640)
  cool.addColorStop(
    0,
    dark ? `rgba(92, 128, 255, ${0.26 * p.glow})` : `rgba(178, 197, 255, ${0.34 * p.glow})`,
  )
  cool.addColorStop(1, 'rgba(178, 197, 255, 0)')
  ctx.fillStyle = cool
  ctx.fillRect(0, 0, DOCK_W, DOCK_H)

  ctx.save()
  ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.045)' : 'rgba(40, 46, 66, 0.035)'
  ctx.lineWidth = 1
  for (let x = 90; x < DOCK_W; x += 90) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, DOCK_H)
    ctx.stroke()
  }
  for (let y = 90; y < DOCK_H; y += 90) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(DOCK_W, y)
    ctx.stroke()
  }
  ctx.restore()

  const top = ctx.createLinearGradient(0, 0, 0, 360)
  top.addColorStop(0, dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.85)')
  top.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, DOCK_W, 360)

  ctx.save()
  for (let i = 0; i < 22; i++) {
    const x = 60 + rand(i) * 960
    const y = 120 + rand(i + 40) * 520
    const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.7 + i))
    ctx.fillStyle = dark
      ? `rgba(255, 255, 255, ${tw * 0.3})`
      : `rgba(255, 255, 255, ${tw * 0.5})`
    ctx.beginPath()
    ctx.arc(x, y, 1.2 + rand(i + 80) * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Dock 面板                                                           */
/* ------------------------------------------------------------------ */
function drawPanel(ctx: Ctx, hover: number, dark: boolean) {
  const w = DOCK_W_BASE + 30 * hover
  const h = DOCK_H_BASE + 16 * hover
  const x = -w / 2
  const y = -h / 2

  ctx.save()
  ellipseShadow(ctx, 0, h / 2 + 26, w * 0.44, 30, 0.32)

  // 白色磨砂底：半透明，能看见底下的冷色背景
  const glass = ctx.createLinearGradient(0, y, 0, y + h)
  if (dark) {
    glass.addColorStop(0, 'rgba(44, 44, 54, 0.78)')
    glass.addColorStop(0.35, 'rgba(30, 30, 38, 0.62)')
    glass.addColorStop(1, 'rgba(20, 20, 27, 0.7)')
  } else {
    glass.addColorStop(0, 'rgba(255, 255, 255, 0.72)')
    glass.addColorStop(0.35, 'rgba(255, 255, 255, 0.52)')
    glass.addColorStop(1, 'rgba(247, 247, 251, 0.62)')
  }
  rr(ctx, x, y, w, h, 54)
  ctx.fillStyle = glass
  ctx.fill()

  ctx.lineWidth = 1.4
  ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.85)'
  ctx.stroke()

  // 顶边内高光 + 底边压暗
  ctx.save()
  rr(ctx, x + 2, y + 2, w - 4, h - 4, 52)
  ctx.clip()
  const rim = ctx.createLinearGradient(0, y, 0, y + 34)
  rim.addColorStop(0, dark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)')
  rim.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = rim
  ctx.fillRect(x, y, w, 40)

  const low = ctx.createLinearGradient(0, y + h - 44, 0, y + h)
  low.addColorStop(0, dark ? 'rgba(0, 0, 0, 0)' : 'rgba(40, 46, 66, 0)')
  low.addColorStop(1, dark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(40, 46, 66, 0.06)')
  ctx.fillStyle = low
  ctx.fillRect(x, y + h - 44, w, 44)
  ctx.restore()

  // 内侧一圈极细的暗线，玻璃才有厚度
  ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(40, 46, 66, 0.07)'
  ctx.lineWidth = 1
  rr(ctx, x + 4, y + 4, w - 8, h - 8, 50)
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* 图标内部：五套小画                                                   */
/* ------------------------------------------------------------------ */
function artFiles(ctx: Ctx, q: number) {
  // 两张纸先升起来，在文件夹身后
  const lift = easeOut(q) * 26
  for (let k = 0; k < 2; k++) {
    const yy = -40 - lift - k * 6
    ctx.save()
    ctx.translate(0, yy + k * 2)
    ctx.rotate((k === 0 ? -1 : 1) * 0.035)
    ctx.fillStyle = k === 0 ? '#ffffff' : '#f1f4ff'
    rr(ctx, -27, -10, 54, 34, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(40, 70, 140, 0.18)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // 几行字
    ctx.strokeStyle = 'rgba(50, 80, 150, 0.28)'
    ctx.lineWidth = 1.6
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(-17, 0 + i * 7)
      ctx.lineTo(17 - i * 5, 0 + i * 7)
      ctx.stroke()
    }
    ctx.restore()
  }

  // 文件夹后板 + 标签
  ctx.fillStyle = '#2f6fe0'
  rr(ctx, -44, -30, 88, 60, 16)
  ctx.fill()
  ctx.fillStyle = '#3f8cff'
  rr(ctx, -40, -43, 38, 22, 8)
  ctx.fill()

  // 前板：点击后稍微前倾
  ctx.save()
  ctx.translate(0, 3 + q * 2)
  const front = ctx.createLinearGradient(0, -18, 0, 38)
  front.addColorStop(0, '#6aa5ff')
  front.addColorStop(1, '#3f8cff')
  ctx.fillStyle = front
  rr(ctx, -44, -16, 88, 56, 16)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.restore()
}

function artMessages(ctx: Ctx, t: number, badge: number, send: number) {
  // 气泡
  ctx.save()
  const b = ctx.createLinearGradient(0, -28, 0, 26)
  b.addColorStop(0, '#ff9276')
  b.addColorStop(1, '#ff7a59')
  ctx.fillStyle = b
  ctx.beginPath()
  ctx.moveTo(-42, -26)
  ctx.arcTo(42, -26, 42, 26, 26)
  ctx.lineTo(42, 2)
  ctx.arcTo(42, 26, 16, 26, 24)
  ctx.lineTo(-12, 26)
  ctx.lineTo(-26, 40)
  ctx.lineTo(-28, 26)
  ctx.arcTo(-42, 26, -42, 0, 26)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.restore()

  // 正在输入的三颗点
  for (let i = 0; i < 3; i++) {
    const yy = -2 + Math.sin(t * 5.2 + i * 0.9) * 2.6
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 - i * 0.12})`
    ctx.beginPath()
    ctx.arc(-18 + i * 18, yy, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // 发出去的小气泡
  if (send > 0) {
    const q = easeOut(send)
    ctx.save()
    ctx.globalAlpha = 1 - smooth(0.65, 1, send)
    ctx.translate(34 + q * 22, -56 - q * 58)
    ctx.scale(0.5 + q * 0.5, 0.5 + q * 0.5)
    ctx.fillStyle = '#ff7a59'
    rr(ctx, -19, -14, 38, 28, 14)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(-8 + i * 8, 0, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // 红色角标：弹出来，发完消息再缩回去
  if (badge > 0.001) {
    const s = easeBack(badge)
    ctx.save()
    ctx.translate(36, -36)
    ctx.scale(s, s)
    ctx.shadowColor = 'rgba(255, 59, 48, 0.35)'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#ff3b30'
    ctx.beginPath()
    ctx.arc(0, 0, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = '700 19px Geist, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('3', 0, 1)
    ctx.restore()
  }
}

function artMusic(ctx: Ctx, t: number, split: number) {
  const spin = split > 0 ? (t - 4.6) * 3.4 : 0
  ctx.save()
  ctx.rotate(spin)
  ctx.fillStyle = '#1d1d24'
  ctx.beginPath()
  ctx.arc(0, 0, 42, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1.2
  for (let r = 14; r < 42; r += 5) {
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  const label = ctx.createRadialGradient(-6, -8, 0, 0, 0, 16)
  label.addColorStop(0, '#b49cff')
  label.addColorStop(1, '#7c4dff')
  ctx.fillStyle = label
  ctx.beginPath()
  ctx.arc(0, 0, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f5f1ff'
  ctx.beginPath()
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 玻璃封套：点开后左右裂开
  const off = easeOut(split) * 26
  for (const side of [-1, 1] as const) {
    ctx.save()
    ctx.beginPath()
    if (side < 0) ctx.rect(-58, -58, 58, 116)
    else ctx.rect(0, -58, 58, 116)
    ctx.clip()
    ctx.translate(side * off, 0)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)'
    ctx.fillRect(-58, -58, 116, 116)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1.2
    ctx.strokeRect(side < 0 ? -58 : 0.5, -58, 57, 116)
    // 封套上的斜高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.beginPath()
    ctx.moveTo(side * 40, -56)
    ctx.lineTo(side * 6, 56)
    ctx.stroke()
    ctx.restore()
  }

  // 均分器
  if (split > 0) {
    for (let i = 0; i < 5; i++) {
      const h = 8 + Math.abs(Math.sin(t * 6 + i * 1.2)) * 22 * smooth(0, 0.4, split)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      rr(ctx, -30 + i * 13, 40 - h, 7, h, 3)
      ctx.fill()
    }
  }
}

function artPhotos(ctx: Ctx, lift: number) {
  ctx.save()
  ctx.translate(0, -lift * 10)
  ctx.rotate(-0.05 - lift * 0.09)
  ctx.fillStyle = '#ffffff'
  rr(ctx, -38, -40, 76, 82, 8)
  ctx.fill()
  ctx.shadowColor = 'rgba(40, 30, 50, 0.16)'
  ctx.shadowBlur = 12
  // 照片内容
  ctx.save()
  ctx.translate(0, -2)
  ctx.fillStyle = '#f7d9e8'
  ctx.fillRect(-31, -33, 62, 68)
  ctx.fillStyle = '#ffb02e'
  ctx.beginPath()
  ctx.arc(-12, -18, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ff6f9c'
  ctx.beginPath()
  ctx.arc(10, 6, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ff9ab8'
  ctx.beginPath()
  ctx.arc(-8, 22, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.restore()
}

function artCalendar(ctx: Ctx, check: number) {
  ctx.fillStyle = '#ffffff'
  rr(ctx, -40, -44, 80, 90, 12)
  ctx.fill()
  ctx.fillStyle = '#ff5a5f'
  rr(ctx, -40, -44, 80, 26, 12)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.fillRect(-40, -22, 80, 4)
  ctx.fillStyle = '#34b27b'
  ctx.font = '700 44px Geist, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('18', 0, 10)
  ctx.fillStyle = 'rgba(40, 60, 50, 0.32)'
  ctx.font = '500 12px Geist, sans-serif'
  ctx.fillText('NOV', 0, 24)
  // 顶部两颗环
  ctx.strokeStyle = 'rgba(60, 60, 70, 0.35)'
  ctx.lineWidth = 3
  for (const x of [-20, 20]) {
    ctx.beginPath()
    ctx.arc(x, -46, 7, Math.PI, Math.PI * 2)
    ctx.stroke()
  }
  if (check > 0) {
    const s = easeBack(check)
    ctx.save()
    ctx.translate(28, 26)
    ctx.scale(s, s)
    ctx.fillStyle = '#34b27b'
    ctx.beginPath()
    ctx.arc(0, 0, 17, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-7, 0)
    ctx.lineTo(-1, 6)
    ctx.lineTo(8, -5)
    ctx.stroke()
    ctx.restore()
  }
}

function drawIconArt(ctx: Ctx, i: number, t: number, click: number, badge: number) {
  switch (i) {
    case 0:
      artFiles(ctx, click)
      break
    case 1:
      artMessages(ctx, t, badge, click)
      break
    case 2:
      artMusic(ctx, t, click)
      break
    case 3:
      artPhotos(ctx, click)
      break
    default:
      artCalendar(ctx, click)
  }
}

/* ------------------------------------------------------------------ */
/* 单个图标                                                            */
/* ------------------------------------------------------------------ */
/** 第 i 个图标被点击后的进度（0..1，点击瞬间从 0 开始） */
function stateOf(t: number, i: number): number {
  const at = i === 1 ? CLICK[1] : CLICK[i]
  return c01((t - at) / 0.55)
}

/** Messages 的角标：先弹出来，发消息后缩回去 */
function badgeOf(t: number, i: number): number {
  if (i !== 1) return 0
  const up = c01((t - CLICK[1]) / 0.5)
  const down = c01((t - SEND_AT) / 0.35)
  return up * (1 - down)
}

function shade(hex: string, amt: number): string {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const f = (v: number) => clamp(Math.round(v + 255 * amt), 0, 255)
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`
}

/* ------------------------------------------------------------------ */
/* 整组：面板 + 图标                                                   */
/* ------------------------------------------------------------------ */
function drawGroup(
  ctx: Ctx,
  t: number,
  p: DockParams,
  sx: number,
  sy: number,
  gs: { ix: number; dx: number; dy: number; g: number }[],
  avg: number,
  open: number,
) {
  ctx.save()
  ctx.translate(CX, CY)
  ctx.scale(sx, sy)

  drawPanel(ctx, avg, p.dark)

  const spread = 1 + 0.045 * avg

  for (let i = 0; i < 5; i++) {
    const popAt = 0.36 + i * 0.1
    const pop = easeBack(c01((t - popAt) / 0.5))
    const outDelay = (4 - i) * 0.075
    const out = smooth(BLUR_OUT + outDelay, BLUR_OUT + outDelay + 0.52, t)
    const geom = { ...gs[i], ix: CX + ICON_OFFS[i] * spread }
    ctx.save()
    ctx.translate(ICON_OFFS[i] * spread, 0)
    // drawIcon 内部自己用屏幕坐标算平移，这里只提供本地 x 偏移
    drawIconLocal(ctx, i, t, p, geom, pop, out, open)
    ctx.restore()
  }

  ctx.restore()
}

/**
 * drawIcon 的本地版本：本来可以直接用屏幕坐标，但 group 已经缩放，
 * 所以把屏幕 x 换算回本地 x。
 */
function drawIconLocal(
  ctx: Ctx,
  i: number,
  t: number,
  p: DockParams,
  geom: { ix: number; dx: number; dy: number; g: number },
  pop: number,
  out: number,
  open: number,
) {
  const { dx, g } = geom
  const lift = -34 * g + 26 * out
  const scale = (0.22 + 0.78 * pop) * (1 + 0.36 * g) * p.iconScale
  const tilt = clamp(dx / 230, -1, 1) * 0.1 * g

  ctx.save()
  ctx.globalAlpha = c01((1 - out) * open)
  ctx.translate(dx * 0.018 * g, lift)
  ctx.scale(scale, scale)
  ctx.transform(1 - Math.abs(tilt) * 0.35, tilt * 0.08, 0, 1, 0, 0)
  if (out > 0.01) ctx.filter = `blur(${out * 9}px)`

  ctx.save()
  ctx.filter = 'none'
  ellipseShadow(ctx, 0, 64, 50, 10, 0.22 * (1 - out) * (1 - g * 0.35))
  ctx.restore()

  const base = ctx.createLinearGradient(0, -58, 0, 58)
  base.addColorStop(0, COLORS[i])
  base.addColorStop(1, shade(COLORS[i], -0.16))
  ctx.fillStyle = base
  rr(ctx, -58, -58, 116, 116, 30)
  ctx.fill()
  ctx.lineWidth = 1.2
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.stroke()

  ctx.save()
  rr(ctx, -56, -56, 112, 112, 28)
  ctx.clip()
  if (i === 0) {
    ctx.translate(0, 4)
    drawIconArt(ctx, i, t, 0, 0)
  } else {
    drawIconArt(ctx, i, t, stateOf(t, i), badgeOf(t, i))
  }
  ctx.restore()

  ctx.save()
  rr(ctx, -56, -56, 112, 112, 28)
  ctx.clip()
  const pane = ctx.createLinearGradient(0, -56, 0, 56)
  pane.addColorStop(0, 'rgba(255, 255, 255, 0.22)')
  pane.addColorStop(0.45, 'rgba(255, 255, 255, 0.08)')
  pane.addColorStop(1, 'rgba(255, 255, 255, 0.16)')
  ctx.fillStyle = pane
  ctx.fillRect(-58, -58, 116, 116)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-58, -30)
  ctx.lineTo(58, -42)
  ctx.stroke()
  ctx.restore()

  const since = t - CLICK[i]
  const still = i === 1 ? smooth(0.5, 0.9, t - SEND_AT) : smooth(0.5, 0.9, since)
  if (still > 0.01 && out < 0.4) {
    ctx.save()
    ctx.globalAlpha = still * (1 - out)
    for (let k = 0; k < 3; k++) {
      const bounce = Math.abs(Math.sin(t * 7 + k * 1.1)) * 4
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.beginPath()
      ctx.arc(-10 + k * 10, 76 - bounce, 3.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* 悬浮标签 + 顶边灯条                                                 */
/* ------------------------------------------------------------------ */
function drawLabel(
  ctx: Ctx,
  p: DockParams,
  cursor: Cursor,
  open: number,
  fold: number,
) {
  if (!p.label) return
  let best = 0
  let score = 0
  for (let i = 0; i < 5; i++) {
    const g = iconGeom(i, cursor, 1, p.magnify).g
    if (g > score) {
      score = g
      best = i
    }
  }
  const alpha = smooth(0.2, 0.55, score) * smooth(0.4, 0.8, open) * (1 - fold)
  if (alpha < 0.01) return

  const ix = iconScreenX(best, 1)
  const dockTop = CY - (DOCK_H_BASE / 2 + 8) * (0.14 + 0.86 * open) * (1 - 0.92 * fold)
  const y = dockTop - 44
  const label = NAMES[best]
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = '600 19px Geist, sans-serif'
  const w = Math.max(84, ctx.measureText(label).width + 34)
  ctx.translate(ix, y)
  ctx.scale(0.92 + 0.08 * alpha, 0.92 + 0.08 * alpha)

  ctx.shadowColor = 'rgba(30, 36, 56, 0.18)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 6
  ctx.fillStyle = p.dark ? 'rgba(32, 32, 40, 0.86)' : 'rgba(255, 255, 255, 0.78)'
  rr(ctx, -w / 2, -16, w, 32, 16)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = p.dark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = 1
  ctx.stroke()

  // 小尖角
  ctx.fillStyle = p.dark ? 'rgba(32, 32, 40, 0.86)' : 'rgba(255, 255, 255, 0.78)'
  ctx.beginPath()
  ctx.moveTo(-5, 15)
  ctx.lineTo(0, 22)
  ctx.lineTo(5, 15)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = p.dark ? 'rgba(245, 245, 250, 0.92)' : 'rgba(35, 35, 40, 0.86)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 0, 0)
  ctx.restore()
}

function drawEdgeLight(ctx: Ctx, open: number, fold: number, cursor: Cursor, avg: number) {
  const dockTop = CY - (DOCK_H_BASE / 2 + 8) * (0.14 + 0.86 * open) * (1 - 0.92 * fold)
  const y = dockTop + 2
  const x = clamp(cursor.x, 170, 910)
  const alpha = smooth(0.1, 0.5, avg) * (1 - fold) * 0.55
  if (alpha < 0.01) return
  ctx.save()
  ctx.globalAlpha = alpha
  const g = ctx.createLinearGradient(x - 120, 0, x + 120, 0)
  g.addColorStop(0, 'rgba(255, 255, 255, 0)')
  g.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)')
  g.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = g
  ctx.fillRect(x - 120, y, 240, 2.2)
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* 光标 + 点击涟漪                                                     */
/* ------------------------------------------------------------------ */
function drawCursor(ctx: Ctx, t: number, cursor: Cursor) {
  const fade = smooth(0.45, 0.8, t) * (1 - smooth(8.9, 9.35, t))
  if (fade < 0.01) return

  // 涟漪：每个点击后 0.4 秒
  for (let i = 0; i < 5; i++) {
    const at = i === 1 ? SEND_AT : CLICK[i]
    const q = c01((t - at) / 0.42)
    if (t < at || q <= 0 || q >= 1) continue
    ctx.save()
    ctx.globalAlpha = (1 - q) * 0.5 * fade
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(iconScreenX(i, 1), CY - 10, 10 + q * 44, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = fade
  ctx.translate(cursor.x, cursor.y)
  ctx.shadowColor = 'rgba(20, 24, 36, 0.28)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 31)
  ctx.lineTo(8, 24)
  ctx.lineTo(13.5, 36)
  ctx.lineTo(19, 33.5)
  ctx.lineTo(13.5, 22)
  ctx.lineTo(23, 21)
  ctx.closePath()
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(24, 24, 30, 0.9)'
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* 反射                                                                */
/* ------------------------------------------------------------------ */
let reflCanvas: HTMLCanvasElement | null = null
const REFL_H = 380
const REFL_Y = CY + 72

function drawReflection(
  ctx: Ctx,
  t: number,
  p: DockParams,
  sx: number,
  sy: number,
  gs: { ix: number; dx: number; dy: number; g: number }[],
  avg: number,
  open: number,
  fold: number,
) {
  if (!reflCanvas) {
    reflCanvas = document.createElement('canvas')
    reflCanvas.width = DOCK_W
    reflCanvas.height = REFL_H
  }
  const r = reflCanvas.getContext('2d')
  if (!r) return
  r.clearRect(0, 0, DOCK_W, REFL_H)
  r.save()
  r.filter = 'blur(4px)'
  r.translate(0, -REFL_Y + 2 * (CY + DOCK_H_BASE / 2))
  r.scale(1, -1)
  drawGroup(r, t, p, sx, sy, gs, avg, open)
  r.restore()

  // 越往下越淡
  r.save()
  r.globalCompositeOperation = 'destination-in'
  const fade = r.createLinearGradient(0, 0, 0, REFL_H)
  fade.addColorStop(0, 'rgba(0, 0, 0, 0.42)')
  fade.addColorStop(0.45, 'rgba(0, 0, 0, 0.12)')
  fade.addColorStop(1, 'rgba(0, 0, 0, 0)')
  r.fillStyle = fade
  r.fillRect(0, 0, DOCK_W, REFL_H)
  r.restore()

  ctx.save()
  ctx.globalAlpha = (p.dark ? 0.3 : 0.42) * (1 - fold)
  ctx.drawImage(reflCanvas, 0, REFL_Y)
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* 主入口                                                              */
/* ------------------------------------------------------------------ */
export function render(ctx: Ctx, time: number, params: DockParams = DEFAULT_PARAMS) {
  const t = clamp(time, 0, DURATION)
  const p = params
  const open = easeOut(c01((t - 0.12) / 1.2))
  const fold = easeIn(c01((t - FOLD_AT) / 0.78))
  const cursor = cursorAt(t)
  const spread = 1 + 0.045 * 0

  const gs = [0, 1, 2, 3, 4].map((i) => iconGeom(i, cursor, spread, p.magnify))
  const avg = clamp(gs.reduce((s, g) => s + g.g, 0) / 5, 0, 1)
  const sx = (0.56 + 0.44 * open) * (1 - 0.24 * fold)
  const sy = (0.14 + 0.86 * open) * (1 - 0.92 * fold)

  ctx.clearRect(0, 0, DOCK_W, DOCK_H)
  drawBackground(ctx, t, p)
  drawReflection(ctx, t, p, sx, sy, gs, avg, open, fold)
  drawGroup(ctx, t, p, sx, sy, gs, avg, open)
  drawEdgeLight(ctx, open, fold, cursor, avg)
  drawLabel(ctx, p, cursor, open, fold)
  drawCursor(ctx, t, cursor)

  // 极淡的暗角，边缘收一收
  const vig = ctx.createRadialGradient(CX, 650, 320, CX, 650, 760)
  vig.addColorStop(0, p.dark ? 'rgba(0, 0, 0, 0)' : 'rgba(20, 24, 36, 0)')
  vig.addColorStop(1, p.dark ? 'rgba(0, 0, 0, 0.34)' : 'rgba(20, 24, 36, 0.06)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, DOCK_W, DOCK_H)
}

/** 给总览卡片/首帧用：只画一个静止时刻 */
export function renderStill(ctx: Ctx, time = 3.2, params: DockParams = DEFAULT_PARAMS) {
  render(ctx, time, params)
}