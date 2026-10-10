import { m, useAnimationControls } from 'motion/react'
import { Star } from 'lucide-react'
import { DUR, EASE } from '../lib/motion'

interface StarButtonProps {
  starred: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
  className?: string
  /** 悬停才显示未星标按钮（网格/列表默认） */
  revealOnHover?: boolean
}

/** 三视图共用的星标按钮：图标、配色、显隐规则一致 */
export default function StarButton({
  starred,
  onToggle,
  size = 'md',
  className = '',
  revealOnHover = true,
}: StarButtonProps) {
  const controls = useAnimationControls()
  const box = size === 'sm' ? 'h-6 w-6 rounded-md' : 'h-7 w-7 rounded-lg'
  const icon = size === 'sm' ? 12 : 14
  // 移动端不提供星标操作；桌面端未星标项 hover 行/卡片时显示
  const hidden =
    revealOnHover && !starred
      ? 'hidden lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100'
      : 'opacity-100'

  return (
    <m.button
      type="button"
      role="switch"
      aria-checked={starred}
      aria-label={starred ? '取消星标' : '加星标'}
      animate={controls}
      initial={false}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
        // 加星标时弹一下；取消不弹，避免撤销操作时的视觉噪音
        if (!starred) {
          controls.start({ scale: [1, 1.12, 1], transition: { duration: DUR[2], ease: EASE.soft } })
        }
      }}
      className={`flex items-center justify-center transition-opacity duration-[var(--dur-2)] ease-[var(--ease-out)] ${box} ${hidden} ${
        starred ? 'text-star' : 'text-ink4 hover:bg-canvas hover:text-ink2'
      } ${className}`}
    >
      <Star size={icon} className={starred ? 'fill-star text-star' : undefined} />
    </m.button>
  )
}
