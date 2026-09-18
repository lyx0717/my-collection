import { Search, X } from 'lucide-react'

interface BookmarkFilterInputProps {
  value: string
  onChange: (v: string) => void
  count: number
}

/** 书签库内的筛选搜索（区别于顶栏的互联网搜索引擎） */
export default function BookmarkFilterInput({ value, onChange, count }: BookmarkFilterInputProps) {
  return (
    <div className="flex h-9 w-full items-center gap-2 rounded-[10px] border border-line bg-surface px-3 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(62,92,255,.12)] sm:w-72">
      <Search size={14} className="shrink-0 text-ink3" />
      <input
        id="bookmark-filter-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="筛选书签、标签或域名…"
        className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-[#aca89f]"
      />
      {value ? (
        <>
          <span className="shrink-0 text-[11px] tabular-nums text-accent">{count}</span>
          <button
            onClick={() => onChange('')}
            aria-label="清空筛选"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink3 hover:text-ink"
          >
            <X size={12} />
          </button>
        </>
      ) : (
        <kbd className="hidden shrink-0 rounded border border-line2 border-b-2 px-1 py-0.5 font-mono text-[10px] text-ink3 sm:block">
          /
        </kbd>
      )}
    </div>
  )
}
