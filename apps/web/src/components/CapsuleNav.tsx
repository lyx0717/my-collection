import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLiquidGlass } from '../lib/glass/useLiquidGlass'
import { useSlidingPill } from '../hooks/useSlidingPill'

/**
 * 悬浮胶囊导航 —— 首页分组导航与设置页导航共用同一个组件，
 * 保证两处的宽度计算、居中方式、玻璃材质、图标排布、选中态完全一致。
 *
 * 三个关键点：
 *
 * 1) 宽度由内容决定，而非撑满。
 *    之前用的是 `w-full max-w-[760px]`，即使只有 2 个分组也会拉出一整条宽胶囊，
 *    居中后左右留出大片空白，看起来像「被拉伸的进度条」而不是导航。
 *    这里用 `w-fit`（配合 `max-w` 兜底溢出）让胶囊贴着内容收缩。
 *
 * 2) 玻璃 + 横向滚动的组合有个坑：`backdrop-filter` 会把滚动容器里
 *    已滚出视口的部分也纳入模糊采样，导致滚动时左右两端出现拖影。
 *    所以横向滚动交给内层，外层胶囊固定宽度不滚。
 *
 * 3) 淡出遮罩只给「内容层」，不给「边框层」。
 *    mask-image 遮的是元素的**整个**渲染结果，边框和 box-shadow 一样会被啃掉，
 *    右边缘因此缺一截描边和投影，胶囊直接和下层内容糊在一起 ——
 *    这正是玻璃质感赖以「浮起来」的两个元素。
 *    所以拆成两层：外层保留完整边框+阴影+毛玻璃，内层只负责左右渐隐。
 *
 * 4) 渐隐只在真的溢出时出现。
 *    分组少的时候胶囊按内容收缩，根本滚不动，
 *    无条件挂遮罩只会白吃掉一截右边缘的描边。
 *    用 `canScrollLeft / canScrollRight` 判断，滚到头时对应侧也自动撤掉。
 */

/** 左右渐隐的宽度，与 CSS 里的渐变长度一致 */
const FADE = 20

export interface CapsuleNavItem {
  key: string
  label: string
  /** Lucide 线性图标，与设置页保持同一套视觉语言 */
  icon: ReactNode
  active: boolean
  onClick: () => void
}

interface CapsuleNavProps {
  ariaLabel: string
  items: CapsuleNavItem[]
  /** 超出这个宽度就横向滚动 */
  maxWidth?: string
}

export default function CapsuleNav({
  ariaLabel,
  items,
  maxWidth = 'min(860px, calc(100vw - 32px))',
}: CapsuleNavProps) {
  const navRef = useLiquidGlass<HTMLElement>('nav')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const activeIndex = items.findIndex((item) => item.active)
  // 片子的位置与宽度都靠实测，不受横向滚动影响：
  // offsetLeft 相对 listRef（position: relative），滚走时片子和 tab 一起走。
  const { containerRef: listRef, itemRefs: btnRefs, rect: pill } = useSlidingPill(
    activeIndex,
    items.length,
  )

  // 选中片**不挂** lens：实测片子只有 90×36，位移图铺满整块时
  // Chromium 会把图外的透明区域采进片子内部（整片从 254 掉到 230），
  // 玻璃没做成、倒做出一块灰斑。片子的「厚度」改用 rim 高光 + 顶部弧光表达，
  // 真正的折射留在导航外框那条带上（那里有足够的边距）。
  // 溢出状态要随三件事变化：内容宽度（items 增减）、容器宽度（窗口缩放）、
  // 以及自身滚动位置。三者都会影响「还剩多少可滚空间」。
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const measure = () => {
      const max = el.scrollWidth - el.clientWidth
      setEdges({
        left: el.scrollLeft > 1,
        right: max > 1 && el.scrollLeft < max - 1,
      })
    }

    measure()
    el.addEventListener('scroll', measure, { passive: true })
    // 内容变化（分组增删）不会触发 scroll，必须靠 observer 主动重测
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)

    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [items])

  // 只在单侧溢出时挂渐变，避免给不需要的那侧也留一段透明
    // 选中时给图标"描一遍"：取每条 path 的真实长度，用 Web Animations 把 dashoffset 从 len 归零。
  // 为什么不用 CSS 关键帧：lucide 每个图标的 path 长度都不同，写死 dasharray 只对某几个图标成立；
  // 这里现算现用，任何图标都成立。fills 为空（lucide 全是描边），所以不会出现"只描了半边"。
  const iconRefs = useRef<Map<string, HTMLSpanElement>>(new Map())
  const mountAt = useRef(performance.now())
  const activeKey = items.find((i) => i.active)?.key
  useEffect(() => {
    // 首帧不描：进入页面时图标不该动，只有"用户切换分组"这一个动作才值得反馈。
    // 用时间窗而不是布尔标记 —— StrictMode 会卸载重挂，布尔标记在第二次挂载时已经是 false 了。
    if (performance.now() - mountAt.current < 600) return
    if (!activeKey) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const host = iconRefs.current.get(activeKey)
    const svg = host?.querySelector('svg')
    if (!svg) return
    const shapes = svg.querySelectorAll<SVGGeometryElement>('path, circle, rect, line, polyline, polygon, ellipse')
    shapes.forEach((shape, i) => {
      const len = shape.getTotalLength()
      if (!len) return
      shape.style.strokeDasharray = `${len}`
      shape.style.strokeDashoffset = `${len}`
      shape.animate([{ strokeDashoffset: `${len}` }, { strokeDashoffset: '0' }], {
        duration: 380,
        delay: i * 40,
        easing: 'cubic-bezier(0.3, 0.12, 0.2, 1)',
        fill: 'forwards',
      })
    })
  }, [activeKey])

const fadeMask =
    edges.left || edges.right
      ? `linear-gradient(to right, ${
          edges.left ? 'transparent 0, #000 20px' : '#000 0'
        }, #000 calc(100% - ${FADE}px)${edges.right ? `, transparent 100%` : ' 100%'})`
      : undefined

  return (
    // 外层：只管玻璃质感（边框 / 投影 / 背景 / 毛玻璃），宽度按内容收缩但不滚动。
    // border：CSS 里只写了 border-color，没有 border-width 时整条边框不渲染
    // （实测 computed borderWidth = 0），所以这里必须显式给 border。
    // pointer-events-auto：调用方的 sticky 容器是通栏且整体穿透的，
    // 这里把可点区域精确收回到可见胶囊上，避免容器空白处吃掉下层内容的点击。
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className="liquid-glass liquid-glass--nav liquid-glass--refract pointer-events-auto mx-auto w-fit max-w-full rounded-full"
      style={{ maxWidth }}
    >
      {/* 内层：真正的横向滚动容器。渐隐遮罩挂在这里，
          这样描边与投影留在外层不受影响。 */}
      <div
        ref={scrollerRef}
        className="scrollbar-none flex items-center gap-1 overflow-x-auto rounded-full px-1 py-1"
        style={fadeMask ? { maskImage: fadeMask, WebkitMaskImage: fadeMask } : undefined}
      >
        <div ref={listRef} className="relative flex items-center gap-1">
          {/* 选中片：绝对定位 + transform/width 过渡。两层都带过渡是为了「拉丝」——
              位移先到、宽度后到，视觉上像一滴液体被拽着走，
              最后 overshoot 一点点回弹，这就是 iOS 分段控件的手感。 */}
          {pill && (
            <span
              aria-hidden
              className="liquid-pill pointer-events-none absolute top-0 left-0 rounded-full"
              style={{
                transform: `translate3d(${pill.x}px, ${pill.y}px, 0)`,
                width: `${pill.w}px`,
                height: `${pill.h}px`,
              }}
            />
          )}
        {items.map((item, index) => (
          <button
            key={item.key}
            ref={(el) => {
              btnRefs.current[index] = el
            }}
            onClick={item.onClick}
            aria-current={item.active ? 'page' : undefined}
            // 文字隐藏后图标单独承载语义，aria-label / title 必须留着，
            // 否则读屏用户只会听到一串无意义的「按钮」。
            aria-label={item.label}
            title={item.label}
            // 按下回弹：scale 收到 0.94 松开弹回，150ms —— 16px 的胶囊上幅度再大就会"抖"
            className={`liquid-tab relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap active:scale-[0.94] max-sm:gap-0 max-sm:px-3 ${
              item.active
                ? 'font-semibold text-accent-ink'
                : 'text-ink2 hover:text-ink'
            }`}
          >
            {/* 选中瞬间图标"点一下头"（-1.5px + 6°，220ms 回位）：切换分组时给出明确的落位感，
                幅度刻意压得很小 —— 导航浮在玻璃上，动作一大就破坏稳定感。 */}
            <span
              ref={(el) => {
                if (el) iconRefs.current.set(item.key, el)
                else iconRefs.current.delete(item.key)
              }}
              className={`nav-icon inline-flex ${item.active ? 'text-accent-ink' : 'text-ink3'}`}
            >
              {item.icon}
            </span>
            {/* 窄屏（移动端）只留图标：分组一多，文字会把胶囊撑到需要横向滚动，
                而横向滚动在竖屏页面里几乎不可用。 */}
            <span className="max-sm:hidden">{item.label}</span>
          </button>
        ))}
        </div>
      </div>
    </nav>
  )
}
