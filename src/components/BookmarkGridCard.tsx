import { useState } from 'react'
import { Pencil, Star, Trash2 } from 'lucide-react'
import type { Bookmark } from '../types'
import { coverGradient, domainLetter } from '../lib/color'

interface BookmarkGridCardProps {
  bookmark: Bookmark
  onToggleStar: (id: string) => void
  onTagClick?: (tag: string) => void
  onOpen: (bm: Bookmark) => void
  onEdit: (bm: Bookmark) => void
  onDelete: (bm: Bookmark) => void
}

export default function BookmarkGridCard({
  bookmark,
  onToggleStar,
  onTagClick,
  onOpen,
  onEdit,
  onDelete,
}: BookmarkGridCardProps) {
  const [logoFailed, setLogoFailed] = useState(false)

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(28,27,25,.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(28,27,25,.18),0_2px_6px_rgba(28,27,25,.05)]">
      <button
        onClick={() => onOpen(bookmark)}
        className="relative block h-[128px] w-full cursor-pointer"
        style={{ background: coverGradient(bookmark.domain) }}
        aria-label={`打开 ${bookmark.title}`}
      >
        {bookmark.cover ? (
          <img
            src={bookmark.cover}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.14),transparent_70%)]" />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[18px] bg-white/15 backdrop-blur-sm">
              {!logoFailed ? (
                <img
                  src={`https://favicon.im/${bookmark.domain}?larger=true`}
                  alt=""
                  loading="lazy"
                  onError={() => setLogoFailed(true)}
                  className="h-9 w-9 rounded-lg"
                />
              ) : (
                <span className="text-[26px] font-bold text-white">
                  {domainLetter(bookmark.domain)}
                </span>
              )}
            </span>
          </>
        )}
      </button>

      <button
        onClick={() => onToggleStar(bookmark.id)}
        role="switch"
        aria-checked={bookmark.starred}
        aria-label={bookmark.starred ? '取消星标' : '加星标'}
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/85 backdrop-blur-sm transition-transform hover:scale-105"
      >
        <Star
          size={14}
          className={bookmark.starred ? 'fill-star text-star' : 'text-[#7c786f]'}
        />
      </button>

      <div className="flex flex-1 flex-col px-3.5 py-3">
        <button
          onClick={() => onOpen(bookmark)}
          className="line-clamp-2 min-h-[38px] text-left text-[13.5px] font-semibold leading-[1.4] hover:text-accent"
          title={bookmark.title}
        >
          {bookmark.title}
        </button>
        <div className="mt-1.5 flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink3">
            {bookmark.domain}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
            <button
              onClick={() => onEdit(bookmark)}
              aria-label={`编辑 ${bookmark.title}`}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink3 hover:bg-canvas hover:text-ink"
            >
              <Pencil size={12.5} />
            </button>
            <button
              onClick={() => onDelete(bookmark)}
              aria-label={`删除 ${bookmark.title}`}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink3 hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 size={12.5} />
            </button>
          </span>
        </div>
        {bookmark.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {bookmark.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className="rounded-md border border-line bg-canvas px-[7px] py-[1.5px] text-[10.5px] text-ink2 hover:border-accent/40 hover:text-accent"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
