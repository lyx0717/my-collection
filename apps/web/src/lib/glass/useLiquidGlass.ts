import { useEffect, useRef } from 'react'
import { liquidGlass } from './lens'
import { LENS, type LensMaterial } from './materials'

/**
 * 给一个元素挂上液态玻璃的折射带，返回该元素的 ref。
 *
 * 生命周期收在这一处：lens 实例随元素挂载建立、随卸载销毁，
 * 调用方只负责把 ref 绑到目标元素上（React 18 StrictMode 会挂载→卸载→再挂载，
 * 每次都会重新建实例，不会留下失效的位移图）。
 *
 * 注意：只挂在自带尺寸的大表面（顶栏、分组胶囊）上。
 * 按钮这类小控件不挂 —— 位移图会采到图外透明区，反而糊成一块灰斑。
 */
export function useLiquidGlass<T extends HTMLElement>(material: LensMaterial) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const lens = liquidGlass(el, LENS[material])
    return () => lens.destroy()
  }, [material])

  return ref
}