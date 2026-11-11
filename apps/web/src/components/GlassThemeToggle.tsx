import { useEffect, useRef, useState } from 'react'
import { useAppearance } from '../store/AppearanceContext'
import { systemPrefersDark, type ThemeMode } from '../lib/appearance'
import { createGlassToggle, type GlassToggleApi } from './appearance/glass-toggle.js'
import ThemeToggle from './ThemeToggle'

/** 三态 → 玻璃开关停在哪一侧：这个组件右端是白天 */
function daylightOf(mode: ThemeMode, systemDark: boolean): boolean {
  const dark = mode === 'system' ? systemDark : mode === 'dark'
  return !dark
}

/**
 * 版位尺寸：sm 给顶栏，lg 给设置页。
 *
 * pad 是画布相对版位每边外扩的像素数。光晕衰减宽度跟着 shader 里的缩放走
 * （s = min(1, (w-8)/432, (h-8)/224)），版位放大时 pad 必须同比放大，
 * 否则边界处仍有亮度会被切出一条直边。按 ~1.7×46×s 取：
 * sm 的 s≈0.125 → 10px，lg 的 s≈0.714 → 56px。
 */
const SIZES = {
  sm: { w: 72, h: 36, pad: 10 },
  lg: { w: 324, h: 168, pad: 56 },
} as const

/**
 * 顶栏的液态玻璃明暗开关。
 *
 * shader、LED、像素日月矩阵都在 appearance/glass-toggle.js 里；
 * 这里只负责三件事：挂载一次、把拨动结果写回主题、主题在别处改了就把开关拨过去。
 */

export default function GlassThemeToggle({ size = 'sm' }: { size?: keyof typeof SIZES }) {
  const { theme, setTheme } = useAppearance()
  const rootRef = useRef<HTMLDivElement>(null)
  const spaceRef = useRef<HTMLDivElement>(null)
  const hitRef = useRef<HTMLButtonElement>(null)
  const apiRef = useRef<GlassToggleApi | null>(null)
  const fromWidget = useRef<boolean | null>(null)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const [noWebGL, setNoWebGL] = useState(false)

  // 「跟随系统」时系统换色，开关要跟着拨
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setSystemDark(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [theme])

  const daylight = daylightOf(theme, systemDark)
  const box = SIZES[size]

  // 只挂载一次：模块内部持有 WebGL 上下文与动画循环
  useEffect(() => {
    const root = rootRef.current
    const space = spaceRef.current
    const hit = hitRef.current
    if (!root || !space || !hit) return

    // 每次挂载都新建 canvas：StrictMode 会挂载→卸载→再挂载，复用同一个 canvas 时
    // 第一次 destroy() 已 loseContext，第二次只能拿到死上下文；
    // 画布比版位每边外扩 box.pad，光晕在边界处还有强度，不溢出就会被切出一条直边
    const canvas = document.createElement('canvas')
    canvas.className = 'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
    canvas.style.width = `${box.w + box.pad * 2}px`
    canvas.style.height = `${box.h + box.pad * 2}px`
    root.prepend(canvas)

    let api: GlassToggleApi | null = null
    try {
      api = createGlassToggle({
        root,
        canvas,
        space,
        hit,
        initial: daylightOf(theme, systemDark) ? 1 : 0,
        onChange: (value) => {
          fromWidget.current = value === 1
          setTheme(value === 1 ? 'light' : 'dark')
        },
      })
    } catch (err) {
      // 没有 WebGL2（老显卡/被禁用）：退回普通图标按钮，别留一个看不见的死控件
      console.warn('[glass-toggle] WebGL2 不可用，已回退普通按钮', err)
      setNoWebGL(true)
      return
    }
    apiRef.current = api
    hit.setAttribute('aria-checked', String(daylightOf(theme, systemDark)))
    return () => {
      apiRef.current = null
      api?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 主题在别处（设置页 / 跟随系统 / localStorage）被改时，把开关拨过去
  useEffect(() => {
    if (fromWidget.current === daylight) {
      fromWidget.current = null
      return
    }
    apiRef.current?.set(daylight ? 'day' : 'night', false)
  }, [daylight])

  if (noWebGL) return <ThemeToggle />

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      style={{ width: box.w, height: box.h }}
      aria-hidden={false}
    >
      <div ref={spaceRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <button
          ref={hitRef}
          type="button"
          role="switch"
          aria-label="切换明暗"
          className="absolute inset-0 h-full w-full cursor-pointer touch-none rounded-[34%] border-0 bg-transparent p-0 outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ink"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      </div>
    </div>
  )
}
