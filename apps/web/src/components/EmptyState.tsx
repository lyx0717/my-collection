import type { ReactNode } from 'react'
import { Bookmark } from 'lucide-react'

interface EmptyStateProps {
  title: string
  hint?: string
  action?: ReactNode
}

export default function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line2 bg-surface/60 px-6 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Bookmark size={22} strokeWidth={1.6} />
      </span>
      <p className="mt-4 text-[17px] font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-ink3">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
