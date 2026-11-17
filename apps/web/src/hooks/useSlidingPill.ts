import { useCallback, useEffect, useRef, useState } from 'react'

export interface PillRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 选中片的实测定位。
 *
 * 片子的宽度由文字决定（「全部」和「影音」不一样宽），写死必然错位；
 * 所以不猜，直接在每次布局后量一次。
 *
 * - 位置用 offsetLeft/offsetTop，量的是相对容器 padding box 的坐标：
 *   绝对定位的片子以 padding box 为参考系，两者口径一致，不需要减去 padding。
 * - 容器与每个 item 都挂 ResizeObserver：字体加载完、分组增删、
 *   窗口缩放、切换视图都会改变 item 的宽高，统一由 observer 触发重测。
 * - 不是 framer-motion 的 layoutId：我们的 `LazyMotion features={domAnimation}`
 *   没带 layout 引擎，layoutId 在产物里是空操作（实测切换瞬间到位、无补间），
 *   补上 domMax 要多 30 kB 才换一次位移。位移交给 CSS 过渡（见 `.liquid-pill`），
 *   一起用同一条带回弹的曲线，手感与导航胶囊完全一致。
 */
export function useSlidingPill(activeIndex: number, count: number) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const [rect, setRect] = useState<PillRect | null>(null)

  const measure = useCallback(() => {
    const el = itemRefs.current[activeIndex]
    if (!el) {
      setRect(null)
      return
    }
    setRect({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight })
  }, [activeIndex])

  useEffect(() => {
    measure()
    const box = containerRef.current
    if (!box) return
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    for (const el of itemRefs.current) if (el) ro.observe(el)
    return () => ro.disconnect()
  }, [measure, count])

  return { containerRef, itemRefs, rect }
}
