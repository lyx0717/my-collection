import type { ReactNode } from 'react'
import { Bookmark } from 'lucide-react'

interface EmptyStateProps {
  title: string
  hint?: string
  action?: ReactNode
}

/**
 * 空状态：不画框。
 *
 * 曾经是 820×250 的虚线大框，但虚线在网页语境里等于「把文件拖到这里」，
 * 用在「没有匹配的书签」上语义错位，而且框越大越像一张待填表格，
 * 反而放大「空了」的焦虑。留白本身就是答案 —— 上下各 96px，让内容自己站住。
 */
export default function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Bookmark size={22} strokeWidth={1.6} />
      </span>
      <p className="mt-4 text-[17px] font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-ink3">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
