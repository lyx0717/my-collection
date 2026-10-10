import type { ReactNode } from 'react'

/**
 * 悬浮胶囊导航 —— 首页分组导航与设置页导航共用同一个组件，
 * 保证两处的宽度计算、居中方式、玻璃材质、图标排布、选中态完全一致。
 *
 * 两个关键点：
 *
 * 1) 宽度由内容决定，而非撑满。
 *    之前用的是 `w-full max-w-[760px]`，即使只有 2 个分组也会拉出一整条宽胶囊，
 *    居中后左右留出大片空白，看起来像「被拉伸的进度条」而不是导航。
 *    这里用 `w-fit`（配合 `max-w` 兜底溢出）让胶囊贴着内容收缩。
 *
 * 2) 玻璃 + 横向滚动的组合有个坑：`backdrop-filter` 会把滚动容器里
 *    已滚出视口的部分也纳入模糊采样，导致滚动时左右两端出现拖影。
 *    所以横向滚动交给内层，外层胶囊固定宽度不滚。
 */

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
  return (
    <nav
      aria-label={ariaLabel}
      className="glass-topbar-chips scrollbar-none mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full px-1.5 py-1.5 [mask-image:linear-gradient(to_right,#000_calc(100%_-_20px),transparent)]"
      style={{ maxWidth }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={item.onClick}
          aria-current={item.active ? 'page' : undefined}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap transition-[background-color,color,box-shadow] duration-[var(--dur-2)] ease-[var(--ease-out)] ${
            item.active
              ? 'bg-accent font-semibold text-white shadow-[0_4px_14px_-6px_var(--accent-shadow)]'
              : 'text-ink2 hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <span className={item.active ? 'text-white' : 'text-ink3'}>{item.icon}</span>
          {item.label}
          {item.count !== undefined && (
            <span
              className={`text-[11.5px] tabular-nums ${item.active ? 'text-white/70' : 'text-ink4'}`}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
