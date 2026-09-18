import type { RefObject } from 'react'
import { Menu, Plus, Search, X } from 'lucide-react'

interface TopbarProps {
  query: string
  onQuery: (q: string) => void
  onAdd: () => void
  onOpenMenu: () => void
  searchRef: RefObject<HTMLInputElement>
}

export default function Topbar({ query, onQuery, onAdd, onOpenMenu, searchRef }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-[62px] shrink-0 items-center gap-2.5 border-b border-line bg-surface/95 px-4 backdrop-blur sm:gap-3.5 sm:px-6">
      <button
        onClick={onOpenMenu}
        aria-label="打开分组菜单"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-line text-ink2 lg:hidden"
      >
        <Menu size={17} />
      </button>

      <div className="flex h-[38px] max-w-[520px] flex-1 items-center gap-2 rounded-[11px] border border-line bg-canvas px-3 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(62,92,255,.12)]">
        <Search size={16} className="shrink-0 text-ink3" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="搜索书签、标签或域名…"
          className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-[#aca89f]"
        />
        {query ? (
          <button
            onClick={() => onQuery('')}
            aria-label="清空搜索"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink3 hover:text-ink"
          >
            <X size={13} />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded-md border border-line2 border-b-2 bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink3 sm:block">
            ⌘K
          </kbd>
        )}
      </div>

      <button
        onClick={onAdd}
        className="ml-auto flex h-[38px] shrink-0 items-center gap-1.5 rounded-[11px] bg-accent px-3 text-[13px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(62,92,255,.55)] transition-colors hover:bg-accent-ink sm:px-4"
      >
        <Plus size={15} strokeWidth={2.4} />
        <span className="hidden sm:inline">添加书签</span>
      </button>
    </header>
  )
}
