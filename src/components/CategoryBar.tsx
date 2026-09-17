import type { Category } from '../types'
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories'

export type CategoryFilter = 'all' | Category

interface CategoryBarProps {
  active: CategoryFilter
  counts: Record<CategoryFilter, number>
  onChange: (category: CategoryFilter) => void
}

export default function CategoryBar({ active, counts, onChange }: CategoryBarProps) {
  const chips: { key: CategoryFilter; label: string; icon?: typeof CATEGORIES.movie.icon }[] = [
    { key: 'all', label: '全部' },
    ...CATEGORY_ORDER.map((key) => ({
      key,
      label: CATEGORIES[key].label,
      icon: CATEGORIES[key].icon,
    })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map(({ key, label, icon: Icon }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] tracking-wide transition-all',
              isActive
                ? 'border-gold/55 bg-gold/12 text-gold-bright'
                : 'border-ink-700 bg-ink-900/60 text-paper-dim hover:border-gold/35 hover:text-paper',
            ].join(' ')}
          >
            {Icon && <Icon size={13} strokeWidth={1.8} />}
            {label}
            <span
              className={`font-mono text-[10px] ${isActive ? 'text-gold/80' : 'text-paper-muted'}`}
            >
              {counts[key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
