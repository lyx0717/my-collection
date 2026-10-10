import { useEffect, useRef } from 'react'
import { Rope, FIXED_DT } from '../lib/physics/rope'

/**
 * rAF 物理循环。
 *
 * 为什么要自己写而不是交给 React state：
 * 物理每帧跑 60 次，把节点坐标写进 state 会触发 60 次/s 的重渲染，
 * 而 React 的批处理在动画循环里帮不上忙——这是典型的「把命令式逻辑
 * 放进声明式容器」的错误。正确做法是循环只写 three 对象与 DOM style，
 * 通过 ref 把实例暴露给需要读的地方，React 只管那些低频的 UI（滑杆、chip）。
 */
export function usePhysicsLoop(
  ropeRef: React.RefObject<Rope | null>,
  onFrame?: (dt: number, time: number) => void,
): React.RefObject<number> {
  const timeRef = useRef(0)
  const frameCb = useRef(onFrame)
  frameCb.current = onFrame

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let alive = true

    const tick = (now: number): void => {
      if (!alive) return
      // dt 上限由 rope.update 内部再兜一层；这里先剔除切标签页后的巨大间隔，
      // 否则累积器会积压几秒的物理需要连续追帧，表现为「切回来后卡一下」
      const dt = Math.min((now - last) / 1000, 0.25)
      last = now
      timeRef.current += dt

      const rope = ropeRef.current
      if (rope) {
        rope.update(dt)
        frameCb.current?.(dt, timeRef.current)
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [ropeRef])

  return timeRef
}

export { FIXED_DT }