import { ArrowUpRight, Pencil, Star, Trash2 } from 'lucide-react'
import type { Bookmark } from '../types'
import { shortDate } from '../lib/date'
import Favicon from './Favicon'

interface BookmarkRowProps {
  bookmark: Bookmark
  collectionName?: string
  onEdit: (bm: Bookmark) => void
  onDelete: (bm: Bookmark) => void
  onToggleStar: (id: string) => void
  onTagClick?: (tag: string) => void
  onDomainClick?: (domain: string) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export default function BookmarkRow({
  bookmark,
  collectionName,
  onEdit,
  onDelete,
  onToggleStar,
  onTagClick,
  onDomainClick,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: BookmarkRowProps) {
  if (selectMode) {
    return (
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 py-2.5 transition-colors ${
          selected
            ? 'border-accent/50 bg-accent-soft/50'
            : 'border-line bg-surface hover:border-line2 hover:bg-surface-2'
        }`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect?.(bookmark.id)}
          className="h-4 w-4 shrink-0 accent-accent"
        />
        <Favicon domain={bookmark.domain} faviconUrl={bookmark.faviconUrl} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-ink">{bookmark.title}</div>
          <div className="mt-0.5 truncate text-[12px] text-ink3">
            {bookmark.domain}
            {collectionName ? ` · ${collectionName}` : ''}
          </div>
        </div>
        {bookmark.starred && <Star size={13} className="shrink-0 fill-star text-star" />}
      </label>
    )
  }
  return (
    <div className="group flex items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(28,27,25,.05)] transition-all duration-200 hover:-translate-y-px hover:border-line2 hover:shadow-[0_8px_24px_-12px_rgba(28,27,25,.18),0_2px_6px_rgba(28,27,25,.05)]">
      <Favicon domain={bookmark.domain} faviconUrl={bookmark.faviconUrl} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {bookmark.starred && (
            <Star size={13} className="shrink-0 fill-star text-star" aria-label="已星标" />
          )}
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer noopener"
            className="truncate text-[14px] font-semibold text-ink hover:text-accent"
            title={bookmark.title}
          >
            {bookmark.title}
          </a>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink3">
          <button
            onClick={() => onDomainClick?.(bookmark.domain)}
            className="truncate hover:text-accent"
            title={`筛选 ${bookmark.domain}`}
          >
            {bookmark.domain}
          </button>
          {collectionName && (
            <>
              <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#c9c5bc]" />
              <span className="shrink-0">{collectionName}</span>
            </>
          )}
        </div>
      </div>

      {bookmark.tags.length > 0 && (
        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
          {bookmark.tags.slice(0, 3).map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="rounded-md border border-line bg-canvas px-2 py-[2px] text-[11.5px] text-ink2 hover:border-accent/40 hover:text-accent"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <span className="hidden w-12 shrink-0 text-right text-[12px] tabular-nums text-ink3 sm:block">
        {shortDate(bookmark.createdAt)}
      </span>

      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
        <button
          onClick={() => onToggleStar(bookmark.id)}
          aria-label={bookmark.starred ? '取消星标' : '加星标'}
          className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg hover:bg-canvas ${
            bookmark.starred ? 'text-star opacity-100' : 'text-[#a39f95] hover:text-ink2'
          }`}
        >
          <Star size={15} className={bookmark.starred ? 'fill-star' : undefined} />
        </button>
        <button
          onClick={() => onEdit(bookmark)}
          aria-label={`编辑 ${bookmark.title}`}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#a39f95] hover:bg-canvas hover:text-ink2"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(bookmark)}
          aria-label={`删除 ${bookmark.title}`}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#a39f95] hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`访问 ${bookmark.title}`}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#a39f95] hover:bg-canvas hover:text-accent"
        >
          <ArrowUpRight size={15} />
        </a>
      </div>
    </div>
  )
}
