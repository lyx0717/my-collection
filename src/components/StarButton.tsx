import { Star } from 'lucide-react'

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
  const box = size === 'sm' ? 'h-6 w-6 rounded-md' : 'h-7 w-7 rounded-lg'
  const icon = size === 'sm' ? 12 : 14
  const hidden = revealOnHover && !starred ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : 'opacity-100'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={starred}
      aria-label={starred ? '取消星标' : '加星标'}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`flex items-center justify-center transition-all duration-150 hover:scale-105 ${box} ${hidden} ${
        starred
          ? 'text-star'
          : 'text-[#7c786f] hover:bg-canvas hover:text-ink2'
      } ${className}`}
    >
      <Star size={icon} className={starred ? 'fill-star text-star' : undefined} />
    </button>
  )
}
