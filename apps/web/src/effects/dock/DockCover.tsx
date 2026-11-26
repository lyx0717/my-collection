import { useEffect, useRef } from 'react'
import { useAppearance } from '../../store/AppearanceContext'
import { resolvedTheme } from '../../lib/appearance'
import { DOCK_H, DOCK_W, DURATION, DEFAULT_PARAMS, render, type DockParams } from './scene'

/**
 * Dock 卡片的封面。
 *
 * 首帧是场景真实的 t=4.0s：Dock 已经展开、Messages 的角标刚弹出来。
 * 只有鼠标停在卡片上才走时间，移开就回到首帧——总览页不替用户一直烧 GPU。
 */
export default function DockCover({ active = false }: { active?: boolean }) {
  const { theme } = useAppearance()
  const dark = resolvedTheme(theme) === 'dark'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paramsRef = useRef<DockParams>({ ...DEFAULT_PARAMS, dark })
  const timeRef = useRef(4.0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    paramsRef.current = { ...DEFAULT_PARAMS, dark }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!active || reduced) {
      timeRef.current = 4.0
      render(ctx, timeRef.current, paramsRef.current)
      return
    }

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      timeRef.current = (timeRef.current + dt) % DURATION
      render(ctx, timeRef.current, paramsRef.current)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [active, dark])

  return (
    <div className="fx-dockposter" aria-hidden>
      <canvas
        ref={canvasRef}
        width={DOCK_W}
        height={DOCK_H}
        className="fx-dockposter__canvas"
      />
      <div className="fx-dockposter__meta">
        <span>002</span>
        <span>CANVAS / 10S LOOP</span>
      </div>
    </div>
  )
}
