import type { ReactNode } from 'react'
import { SearchX } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  hint?: string
  action?: ReactNode
}

export default function EmptyState({
  title = '没有找到匹配的藏品',
  hint = '换个关键词，或清空分类与标签筛选试试。',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 px-6 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 text-gold/70">
        <SearchX size={20} strokeWidth={1.6} />
      </span>
      <p className="mt-4 font-serif text-lg text-paper-dim">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm leading-6 text-paper-muted">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
