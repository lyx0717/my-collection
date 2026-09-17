import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react'
import type { Category, Item } from '../types'
import { useCollection } from '../store/CollectionContext'
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories'
import { matchQuery } from '../utils/filter'
import SearchBar from '../components/SearchBar'
import CategoryBar, { type CategoryFilter } from '../components/CategoryBar'
import TagFilter from '../components/TagFilter'
import ItemCard from '../components/ItemCard'
import ItemModal from '../components/ItemModal'
import EmptyState from '../components/EmptyState'

type SortOrder = 'desc' | 'asc'

export default function HomePage() {
  const { items, accessionOf } = useCollection()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOrder>('desc')
  const [opened, setOpened] = useState<Item | null>(null)

  const counts = useMemo(() => {
    const result: Record<CategoryFilter, number> = {
      all: items.length,
      movie: 0,
      food: 0,
      article: 0,
      site: 0,
    }
    for (const item of items) result[item.category] += 1
    return result
  }, [items])

  // 标签池只受分类影响，不受搜索词影响，避免筛选过程中标签消失
  const tagPoolItems = useMemo(
    () => (category === 'all' ? items : items.filter((i) => i.category === category)),
    [items, category],
  )

  const visible = useMemo(() => {
    const filtered = items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (activeTag && !item.tags.includes(activeTag)) return false
      return matchQuery(item, query)
    })
    return filtered.sort((a, b) =>
      sort === 'desc'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    )
  }, [items, category, activeTag, query, sort])

  const handleCategoryChange = (next: CategoryFilter) => {
    setCategory(next)
    setActiveTag(null)
  }

  const mastCounts: Category[] = CATEGORY_ORDER

  return (
    <div>
      {/* 藏品总目刊头 */}
      <section className="pb-10 pt-12 sm:pt-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/70">
          A Personal Collection
        </p>
        <h1 className="mt-3 font-serif text-5xl tracking-[0.12em] text-paper sm:text-6xl">
          藏品总目
        </h1>
        <div className="rule-gold mt-6" />
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-xl text-sm leading-7 text-paper-dim">
            在此收拢散落各处的热爱——一部反复重看的电影、一口记到现在的味道、一篇值得长读的文章、一个想一直留住的网站。
          </p>
          <dl className="flex shrink-0 items-center gap-5">
            {mastCounts.map((key) => {
              const meta = CATEGORIES[key]
              return (
                <div key={key} className="flex items-center gap-2">
                  <meta.icon size={14} strokeWidth={1.7} style={{ color: meta.tint }} />
                  <div className="leading-tight">
                    <dt className="sr-only">{meta.label}</dt>
                    <dd className="font-mono text-base text-paper">{counts[key]}</dd>
                  </div>
                </div>
              )
            })}
            <div className="h-8 w-px bg-ink-700" />
            <div className="leading-tight">
              <dd className="font-mono text-base text-gold">{counts.all}</dd>
              <dd className="text-[10px] tracking-widest text-paper-muted">总藏品</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 检索区 */}
      <section className="sticky top-14 z-20 -mx-4 space-y-3 border-b border-ink-800/70 bg-ink-950/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <SearchBar value={query} onChange={setQuery} resultCount={visible.length} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CategoryBar active={category} counts={counts} onChange={handleCategoryChange} />
          <button
            onClick={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
            className="flex shrink-0 items-center gap-1.5 self-start rounded-md border border-ink-700 px-3 py-1.5 text-xs tracking-wide text-paper-dim transition-colors hover:border-gold/40 hover:text-paper lg:self-auto"
          >
            {sort === 'desc' ? (
              <ArrowDownWideNarrow size={13} strokeWidth={1.8} />
            ) : (
              <ArrowUpWideNarrow size={13} strokeWidth={1.8} />
            )}
            {sort === 'desc' ? '最新收录' : '最早收录'}
          </button>
        </div>
        <TagFilter items={tagPoolItems} active={activeTag} onChange={setActiveTag} />
      </section>

      {/* 藏品网格 */}
      <section className="py-8">
        {visible.length === 0 ? (
          <EmptyState
            action={
              <button
                onClick={() => {
                  setQuery('')
                  setActiveTag(null)
                  setCategory('all')
                }}
                className="rounded-md border border-gold/40 px-4 py-2 text-sm text-gold transition-colors hover:bg-gold/10"
              >
                清空全部筛选
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {visible.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                accession={accessionOf(item.id) ?? 0}
                index={index}
                onOpen={setOpened}
              />
            ))}
          </div>
        )}
      </section>

      {opened && (
        <ItemModal
          item={opened}
          accession={accessionOf(opened.id)}
          onClose={() => setOpened(null)}
        />
      )}
    </div>
  )
}
