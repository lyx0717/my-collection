import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import DockBar from '../../components/DockBar'
import { useToast } from '../../components/Toast'
import { useAppearance } from '../../store/AppearanceContext'
import { resolvedTheme } from '../../lib/appearance'
import {
  DEFAULT_PARAMS,
  DOCK_H,
  DOCK_W,
  DURATION,
  render,
  type DockParams,
} from './scene'
import sceneSource from './scene?raw'
import '../effects.css'

declare global {
  interface Window {
    __dockRender?: (time: number) => void
    __dockReady?: boolean
    __dockLoop?: number
  }
}

const SPEEDS = [0.25, 0.5, 1, 1.5, 2]

const DOCK_PROMPT = `做一个 1080×1350 的桌面 Dock 动效，十秒无缝循环，纯 Canvas 2D、无图片。
画面：浅色桌面，中间一块白色磨砂 Dock（圆角、半透明、顶边高光、底部柔和反射），
五枚图标从左到右：蓝色 Files、珊瑚色 Messages、紫色 Music、暖色 Photos、绿色 Calendar。
0–1.4s：Dock 从一条细线展开，图标依次弹性升起；
2–7s：光标扫过，靠近的图标按高斯衰减放大、上浮、轻微 3D 倾斜，Dock 跟着变宽，
最近图标上方浮出名称胶囊，Dock 顶边有一道跟着光标移动的高光；
点击各自的小动作：Files 文件夹前倾、两张纸升起来；Messages 弹红色角标；Music 玻璃封套裂开、唱片转起来、出现均衡器；Photos 照片抬起；Calendar 落一个勾；随后 Messages 发一颗小气泡、角标消失。点击过的图标下面跑三点省略号。
8.1–9s：图标从右到左虚化淡出，9.1–10s Dock 折回一条线，首尾接上。
交互：所有会动的元素都由同一个 render(t) 现算，点击声可用 WebAudio 轻点一下；prefers-reduced-motion 时只画静止首帧。`

export default function DockDetail() {
  const toast = useToast()
  const { theme } = useAppearance()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLInputElement>(null)
  const timeLabelRef = useRef<HTMLSpanElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const playingRef = useRef(true)
  const speedRef = useRef(1)
  const paramsRef = useRef<DockParams>(DEFAULT_PARAMS)
  const recRef = useRef<MediaRecorder | null>(null)
  const recTimer = useRef<number | undefined>(undefined)
  const [playing, setPlaying] = useState(true)
  const [dark, setDark] = useState(() => resolvedTheme(theme) === 'dark')
  const [speed, setSpeedState] = useState(1)
  const [params, setParams] = useState<DockParams>(DEFAULT_PARAMS)
  const [recording, setRecording] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sourceCopied, setSourceCopied] = useState(false)

  // 舞台跟随站点主题：深色时换成深色桌面，而不是在暗页里糊一块白
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setDark(resolvedTheme(theme) === 'dark')
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [theme])

  useEffect(() => {
    paramsRef.current = { ...paramsRef.current, dark }
    const ctx = ctxRef.current
    if (ctx) render(ctx, timeRef.current, paramsRef.current)
  }, [dark])

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    const prev = document.title
    document.title = '桌面 Dock · 设计特效'
    return () => {
      document.title = prev
    }
  }, [])

  // 主循环：时间自己走，画面每 33ms 重画一次，进度条直接写 DOM 避免整页重渲染
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx

    if (reduced) {
      playingRef.current = false
      setPlaying(false)
      timeRef.current = 4.0
    }

    let raf = 0
    let last = performance.now()
    let lastDraw = 0

    const frame = (now: number) => {
      const dt = Math.min(0.06, (now - last) / 1000)
      last = now
      if (playingRef.current) {
        timeRef.current = (timeRef.current + dt * speedRef.current) % DURATION
      }
      if (now - lastDraw > 32) {
        lastDraw = now
        render(ctx, timeRef.current, paramsRef.current)
        if (progressRef.current) {
          progressRef.current.value = String(timeRef.current)
        }
        if (timeLabelRef.current) {
          timeLabelRef.current.textContent = `${timeRef.current.toFixed(2)}s / ${DURATION.toFixed(2)}s`
        }
      }
      raf = requestAnimationFrame(frame)
    }

    render(ctx, timeRef.current, paramsRef.current)
    raf = requestAnimationFrame(frame)

    window.__dockRender = (t: number) => {
      timeRef.current = t
      render(ctx, t, paramsRef.current)
    }
    window.__dockLoop = DURATION
    window.__dockReady = true

    return () => {
      cancelAnimationFrame(raf)
      delete window.__dockRender
      delete window.__dockReady
      delete window.__dockLoop
      if (recTimer.current) window.clearTimeout(recTimer.current)
      const rec = recRef.current
      if (rec && rec.state !== 'inactive') {
        rec.onstop = null
        rec.stop()
      }
    }
  }, [reduced])

  function setPlay(value: boolean) {
    playingRef.current = value
    setPlaying(value)
  }

  function setSpeed(value: number) {
    speedRef.current = value
    setSpeedState(value)
  }

  function updateParams(patch: Partial<DockParams>) {
    const next = { ...paramsRef.current, ...patch }
    paramsRef.current = next
    setParams(next)
  }

  function seek(value: number) {
    timeRef.current = value
    if (progressRef.current) progressRef.current.value = String(value)
    if (timeLabelRef.current) {
      timeLabelRef.current.textContent = `${value.toFixed(2)}s / ${DURATION.toFixed(2)}s`
    }
    const ctx = ctxRef.current
    if (ctx) render(ctx, value, paramsRef.current)
  }

  function replay() {
    seek(0)
    setPlay(true)
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await stageRef.current?.requestFullscreen()
    } catch {
      toast('浏览器没有允许全屏', 'err')
    }
  }

  function startRecording() {
    if (recording) return
    const canvas = canvasRef.current
    if (!canvas || typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      toast('这个浏览器不支持直接录制画布', 'err')
      return
    }
    const stream = canvas.captureStream(30)
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 8_000_000,
      })
    } catch {
      toast('录制格式初始化失败', 'err')
      return
    }

    const chunks: BlobPart[] = []
    rec.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'desktop-dock-10s.webm'
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setRecording(false)
      recRef.current = null
      toast('已导出 desktop-dock-10s.webm', 'ok')
    }

    recRef.current = rec
    seek(0)
    setPlay(true)
    setRecording(true)
    rec.start(200)
    recTimer.current = window.setTimeout(() => {
      if (rec.state !== 'inactive') rec.stop()
    }, DURATION * 1000 + 120)
    toast('正在录制，十秒后自动保存', 'ok')
  }

  function stopRecording() {
    const rec = recRef.current
    if (!rec) return
    if (recTimer.current) window.clearTimeout(recTimer.current)
    if (rec.state !== 'inactive') rec.stop()
  }

  async function copyText(text: string, ok: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast(ok, 'ok')
      return true
    } catch {
      toast('复制失败，浏览器没给剪贴板权限', 'err')
      return false
    }
  }

  async function copyPrompt() {
    if (await copyText(DOCK_PROMPT, '提示词已复制')) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  async function copySource() {
    if (await copyText(sceneSource, 'render(t) 源码已复制')) {
      setSourceCopied(true)
      window.setTimeout(() => setSourceCopied(false), 1600)
    }
  }

  const status = recording ? 'REC' : playing ? 'LIVE' : 'PAUSED'

  return (
    <div className="min-h-dvh fx">
      <DockBar />
      <div aria-hidden className="h-14" />

      <main className="mx-auto max-w-[1180px] px-4 pt-7 pb-24 sm:px-6 sm:pt-9">
        <Link to="/effects" className="fx-link text-[12px]">
          <ArrowLeft size={14} />
          全部特效
        </Link>

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)] lg:gap-14">
          <section className="mx-auto w-full max-w-[640px]">
            <div
              ref={stageRef}
              className={`fx-dockstage${recording ? ' is-recording' : ''}`}
              onClick={() => {
                if (recording) return
                setPlay(!playingRef.current)
              }}
            >
              <canvas
                ref={canvasRef}
                width={DOCK_W}
                height={DOCK_H}
                className="fx-dockstage__canvas"
                aria-label="桌面 Dock 动效预览"
              />
              <div className="fx-dockstage__meta">
                <span>002</span>
                <span>CANVAS / 10S LOOP</span>
              </div>
              <div className="fx-dockstage__state">
                {recording ? <span className="fx-recdot" /> : null}
                {status}
              </div>
            </div>
            <div className="fx-detail__caption">
              <span>
                舞台 4:5 · {DOCK_W}×{DOCK_H}
              </span>
              <span>点画面暂停 / 继续</span>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24">
            <p className="fx-kicker">002 · 动画 / Canvas</p>
            <h1 className="mt-3 text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink sm:text-[40px]">
              桌面 Dock
            </h1>
            <p className="mt-2 text-[12px] tracking-[0.12em] text-ink3 uppercase">
              Desktop Dock
            </p>

            <div className="mt-5 space-y-3 text-[14px] leading-7 text-ink2">
              <p>
                五枚图标从毛玻璃里长出来，光标扫过就一起长高。点开每一个，
                它们各自做一件小事；十秒一轮，首尾接得上。
              </p>
              <p>
                所有位移都由同一个 <code className="fx-code">render(t)</code>{' '}
                现算，进度条可以随便拖，录屏就是把这十秒原样再跑一遍。
              </p>
            </div>

            <div className="fx-panel mt-7 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-medium text-ink">播放台</h2>
                <span ref={timeLabelRef} className="fx-time">
                  0.00s / 10.00s
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPlay(!playing)}
                  className="fx-playbtn"
                  disabled={recording}
                  aria-label={playing ? '暂停' : '播放'}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button
                  type="button"
                  onClick={replay}
                  className="fx-iconbtn"
                  disabled={recording}
                  aria-label="重播"
                >
                  <RotateCcw size={14} />
                </button>
                <input
                  ref={progressRef}
                  type="range"
                  min={0}
                  max={DURATION}
                  step={0.01}
                  defaultValue={0}
                  onChange={(event) => seek(Number(event.currentTarget.value))}
                  className="fx-range"
                  disabled={recording}
                  aria-label="播放进度"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] text-ink4">速度</span>
                {SPEEDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={speed === value}
                    onClick={() => setSpeed(value)}
                    className="fx-chip"
                    disabled={recording}
                  >
                    {value}×
                  </button>
                ))}
              </div>
            </div>

            <div className="fx-panel mt-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-medium text-ink">实时参数</h2>
                <button
                  type="button"
                  aria-pressed={params.label}
                  onClick={() => updateParams({ label: !params.label })}
                  className="fx-chip"
                >
                  悬浮名称 {params.label ? '开' : '关'}
                </button>
              </div>

              <label className="fx-param mt-2">
                <span>放大强度</span>
                <span className="fx-param__value">{params.magnify.toFixed(2)}</span>
                <input
                  type="range"
                  min={0}
                  max={1.4}
                  step={0.05}
                  value={params.magnify}
                  onChange={(event) =>
                    updateParams({ magnify: Number(event.currentTarget.value) })
                  }
                  className="fx-range"
                />
              </label>
              <label className="fx-param mt-2">
                <span>图标尺寸</span>
                <span className="fx-param__value">
                  {Math.round(params.iconScale * 100)}%
                </span>
                <input
                  type="range"
                  min={0.8}
                  max={1.2}
                  step={0.02}
                  value={params.iconScale}
                  onChange={(event) =>
                    updateParams({ iconScale: Number(event.currentTarget.value) })
                  }
                  className="fx-range"
                />
              </label>
              <label className="fx-param mt-2">
                <span>背景光晕</span>
                <span className="fx-param__value">{params.glow.toFixed(2)}</span>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={params.glow}
                  onChange={(event) =>
                    updateParams({ glow: Number(event.currentTarget.value) })
                  }
                  className="fx-range"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                className={`fx-action${recording ? ' fx-action--rec' : ''}`}
              >
                {recording ? (
                  <>
                    <span className="fx-recdot" />
                    停止录制
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    录制 10 秒
                  </>
                )}
              </button>
              <button type="button" onClick={toggleFullscreen} className="fx-action">
                <Maximize2 size={13} />
                全屏预览
              </button>
              <button
                type="button"
                onClick={() => setSourceOpen((value) => !value)}
                aria-expanded={sourceOpen}
                className="fx-action"
              >
                <ScrollText size={13} />
                {sourceOpen ? '收起源码' : '查看源码'}
              </button>
              <button type="button" onClick={copyPrompt} className="fx-action">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '已复制' : '复制提示词'}
              </button>
            </div>

            {sourceOpen ? (
              <div className="fx-source">
                <div className="fx-source__head">
                  <span>scene.ts · render(t)</span>
                  <button type="button" onClick={copySource} className="fx-chip">
                    {sourceCopied ? '已复制' : '复制源码'}
                  </button>
                </div>
                <pre>
                  <code>{sceneSource}</code>
                </pre>
              </div>
            ) : null}

            <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-5 text-[11.5px]">
              <div>
                <dt className="text-ink4">技术</dt>
                <dd className="mt-1 text-ink2">Canvas 2D / 单画布</dd>
              </div>
              <div>
                <dt className="text-ink4">设计稿</dt>
                <dd className="mt-1 text-ink2">
                  {DOCK_W} × {DOCK_H}
                </dd>
              </div>
              <div>
                <dt className="text-ink4">节奏</dt>
                <dd className="mt-1 text-ink2">10 秒无缝循环</dd>
              </div>
              <div>
                <dt className="text-ink4">录制</dt>
                <dd className="mt-1 text-ink2">MediaRecorder · webm</dd>
              </div>
            </dl>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-4 text-[12px]">
              <span className="text-ink4">下一个</span>
              <Link to="/effects/book-card" className="fx-link text-[12px]">
                书页卡片
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}