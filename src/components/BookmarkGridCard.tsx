import { Pencil, Trash2 } from 'lucide-react'
import type { Bookmark } from '../types'
import { coverGradient } from '../lib/color'
import { badgeText } from '../lib/badge'
import { useFaviconSrc } from '../hooks/useFavicon'
import StarButton from './StarButton'

interface BookmarkGridCardProps {
  bookmark: Bookmark
  compact?: boolean
  onToggleStar: (id: string) => void
  onTagClick?: (tag: string) => void
  onOpen: (bm: Bookmark) => void
  onEdit: (bm: Bookmark) => void
  onDelete: (bm: Bookmark) => void
}

export default function BookmarkGridCard({
  bookmark,
  compact = false,
  onToggleStar,
  onTagClick,
  onOpen,
  onEdit,
  onDelete,
}: BookmarkGridCardProps) {
  const { src, failed, handleError } = useFaviconSrc(bookmark.domain, bookmark.faviconUrl)

  const coverH = compact ? 'h-[92px]' : 'h-[128px]'
  const logoBox = compact ? 'h-11 w-11 rounded-[13px]' : 'h-16 w-16 rounded-[18px]'
  const logoImg = compact ? 'h-6 w-6 rounded-md' : 'h-9 w-9 rounded-lg'
  const letter = compact ? 'text-[20px]' : 'text-[26px]'
  const cardR = compact ? 'rounded-[14px]' : 'rounded-2xl'
  const bodyP = compact ? 'px-3 py-2.5' : 'px-3.5 py-3'
  const titleCls = compact
    ? 'line-clamp-2 min-h-[34px] text-[12.5px] font-semibold leading-[1.36]'
    : 'line-clamp-2 min-h-[38px] text-[13.5px] font-semibold leading-[1.4]'

  return (
    <article
      className={`glass-card group relative flex flex-col overflow-hidden border border-line bg-surface shadow-[0_1px_2px_rgba(28,27,25,.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(28,27,25,.18),0_2px_6px_rgba(28,27,25,.05)] ${cardR}`}
    >
      <button
        onClick={() => onOpen(bookmark)}
        className={`relative block w-full cursor-pointer ${coverH}`}
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
            <span
              className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden bg-white/15 backdrop-blur-sm ${logoBox}`}
            >
              {!failed && src ? (
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  onError={handleError}
                  className={logoImg}
                />
              ) : failed ? (
                <span className={`font-bold text-white ${letter}`}>
                  {badgeText(bookmark.domain, bookmark.title)}
                </span>
              ) : (
                <span className="h-4 w-4 animate-pulse rounded-full bg-white/40" />
              )}
            </span>
          </>
        )}
      </button>

      <StarButton
        starred={bookmark.starred}
        onToggle={() => onToggleStar(bookmark.id)}
        size={compact ? 'sm' : 'md'}
        revealOnHover={!bookmark.starred}
        className="absolute right-2 top-2 bg-white/85 backdrop-blur-sm"
      />

      <div className={`flex flex-1 flex-col ${bodyP}`}>
        <button
          onClick={() => onOpen(bookmark)}
          className={`text-left hover:text-accent ${titleCls}`}
          title={bookmark.title}
        >
          {bookmark.title}
        </button>
        <div className={`flex items-center gap-1 ${compact ? 'mt-1' : 'mt-1.5'}`}>
          <span className="min-w-0 flex-1 truncate text-[11px] text-ink3">
            {bookmark.domain}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
            <button
              onClick={() => onEdit(bookmark)}
              aria-label={`编辑 ${bookmark.title}`}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink3 hover:bg-canvas hover:text-ink"
            >
              <Pencil size={compact ? 11.5 : 12.5} />
            </button>
            <button
              onClick={() => onDelete(bookmark)}
              aria-label={`删除 ${bookmark.title}`}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink3 hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 size={compact ? 11.5 : 12.5} />
            </button>
          </span>
        </div>
        {bookmark.tags.length > 0 && (
          <div className={`mt-2 flex flex-wrap gap-1 ${compact ? 'mt-1.5' : ''}`}>
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
