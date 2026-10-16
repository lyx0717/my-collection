import { useEffect, useRef, useState, type ReactNode } from 'react'

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
  /** 计数（可选）。显示为更小、更淡的数字 */
  count?: number
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
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

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
      aria-label={ariaLabel}
      className="glass-topbar-chips pointer-events-auto mx-auto w-fit max-w-full rounded-full border"
      style={{ maxWidth }}
    >
      {/* 内层：真正的横向滚动容器。渐隐遮罩挂在这里，
          这样描边与投影留在外层不受影响。 */}
      <div
        ref={scrollerRef}
        className="scrollbar-none flex items-center gap-1 overflow-x-auto rounded-full px-1 py-1"
        style={fadeMask ? { maskImage: fadeMask, WebkitMaskImage: fadeMask } : undefined}
      >
        {items.map((item) => (
          <button
            key={item.key}
            onClick={item.onClick}
            aria-current={item.active ? 'page' : undefined}
            // 文字隐藏后图标单独承载语义，aria-label / title 必须留着，
            // 否则读屏用户只会听到一串无意义的「按钮」。
            aria-label={item.count !== undefined ? `${item.label}，${item.count} 条` : item.label}
            title={item.label}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap transition-[background-color,color,box-shadow] duration-[var(--dur-2)] ease-[var(--ease-out)] max-sm:gap-0 max-sm:px-3 ${
              item.active
                ? 'bg-accent font-semibold text-white shadow-[0_4px_14px_-6px_var(--accent-shadow)]'
                : 'text-ink2 hover:bg-surface-2 hover:text-ink'
            }`}
          >
            <span className={item.active ? 'text-white' : 'text-ink3'}>{item.icon}</span>
            {/* 窄屏（移动端）只留图标：分组一多，文字会把胶囊撑到需要横向滚动，
                而横向滚动在竖屏页面里几乎不可用。计数同理，先让位给图标。 */}
            <span className="max-sm:hidden">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={`text-[11.5px] tabular-nums max-sm:hidden ${
                  item.active ? 'text-white/70' : 'text-ink4'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
