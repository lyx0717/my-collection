import { useMemo } from 'react'
import type { Item } from '../types'
import { Hash } from 'lucide-react'

interface TagFilterProps {
  items: Item[]
  active: string | null
  onChange: (tag: string | null) => void
}

/** 在当前分类范围内按出现频次聚合标签 */
export default function TagFilter({ items, active, onChange }: TagFilterProps) {
  const tags = useMemo(() => {
    const counter = new Map<string, number>()
    for (const item of items) {
      for (const tag of item.tags) counter.set(tag, (counter.get(tag) ?? 0) + 1)
    }
    return [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
  }, [items])

  if (tags.length === 0) return null

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.25em] text-paper-muted">
        <Hash size={11} />
        标签
      </span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(([tag, count]) => {
          const isActive = active === tag
          return (
            <button
              key={tag}
              onClick={() => onChange(isActive ? null : tag)}
              className={[
                'rounded-md px-2.5 py-1 text-xs tracking-wide transition-colors',
                isActive
                  ? 'bg-gold/18 text-gold-bright ring-1 ring-gold/45'
                  : 'text-paper-muted hover:bg-ink-800 hover:text-paper-dim',
              ].join(' ')}
            >
              {tag}
              <span className="ml-1 font-mono text-[10px] opacity-60">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
