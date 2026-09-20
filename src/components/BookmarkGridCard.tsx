import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, Trash2 } from 'lucide-react'
import type { Bookmark } from '../types'
import { coverGradient, letterColor } from '../lib/color'
import { badgeText } from '../lib/badge'
import { useFaviconSrc } from '../hooks/useFavicon'
import StarButton from './StarButton'

interface BookmarkGridCardProps {
  bookmark: Bookmark
  compact?: boolean
  sortable?: boolean
  onToggleStar: (id: string) => void
  onTagClick?: (tag: string) => void
  onOpen: (bm: Bookmark) => void
  onEdit: (bm: Bookmark) => void
  onDelete: (bm: Bookmark) => void
}

export default function BookmarkGridCard({
  bookmark,
  compact = false,
  sortable = false,
  onToggleStar,
  onTagClick,
  onOpen,
  onEdit,
  onDelete,
}: BookmarkGridCardProps) {
  const { src, failed, handleError } = useFaviconSrc(bookmark.domain, bookmark.faviconUrl)
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: bookmark.id,
    disabled: !sortable,
  })

  const coverH = compact ? 'h-[92px]' : 'h-[128px]'
  const logoBox = compact ? 'h-11 w-11 rounded-[13px]' : 'h-16 w-16 rounded-[18px]'
  // 仅放大 logo（相对改版前约 1.5×），容器与卡片高度保持原样
  const logoImg = compact ? 'h-9 w-9 rounded-lg' : 'h-[54px] w-[54px] rounded-xl'
  const letter = compact ? 'text-[22px]' : 'text-[28px]'
  const cardR = compact ? 'rounded-[14px]' : 'rounded-2xl'
  const bodyP = compact ? 'px-3 py-2.5' : 'px-3.5 py-3'
  const titleCls = compact
    ? 'line-clamp-2 min-h-[34px] text-[12.5px] font-semibold leading-[1.36]'
    : 'line-clamp-2 min-h-[38px] text-[13.5px] font-semibold leading-[1.4]'

  return (
    <article
      ref={setNodeRef}
      style={sortable ? { transform: CSS.Transform.toString(transform), transition } : undefined}
      className={`glass-card group relative flex touch-none flex-col overflow-hidden border border-line bg-surface shadow-[0_1px_2px_rgba(28,27,25,.05)] transition-shadow duration-200 hover:border-line2 hover:shadow-[0_8px_24px_-12px_rgba(28,27,25,.18),0_2px_6px_rgba(28,27,25,.05)] ${cardR} ${
        isDragging ? 'z-10 opacity-70 ring-2 ring-accent/50' : ''
      }`}
      {...(sortable ? { ...attributes, ...listeners } : {})}
    >
      <button
        onClick={() => onOpen(bookmark)}
        onPointerDown={(e) => e.stopPropagation()}
        className={`relative block w-full cursor-pointer ${coverH}`}
        style={{
          background: bookmark.cover ? undefined : coverGradient(bookmark.domain),
        }}
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
          <span
            className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden border border-white/40 bg-white/50 shadow-[0_1px_2px_rgba(28,27,25,.06)] backdrop-blur-sm ${logoBox}`}
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
              (() => {
                const c = letterColor(bookmark.domain)
                return (
                  <span
                    className={`flex h-full w-full items-center justify-center font-bold ${letter}`}
                    style={{ background: c.bg, color: c.fg }}
                  >
                    {badgeText(bookmark.domain, bookmark.title)}
                  </span>
                )
              })()
            ) : (
              <span className="h-4 w-4 animate-pulse rounded-full bg-line2" />
            )}
          </span>
        )}
      </button>

      <div className="absolute right-2 top-2" onPointerDown={(e) => e.stopPropagation()}>
        <StarButton
          starred={bookmark.starred}
          onToggle={() => onToggleStar(bookmark.id)}
          size={compact ? 'sm' : 'md'}
          revealOnHover={!bookmark.starred}
          className="bg-white/85 backdrop-blur-sm"
        />
      </div>

      <div className={`flex flex-1 flex-col ${bodyP}`}>
        <button
          onClick={() => onOpen(bookmark)}
          className={`text-left hover:text-accent ${titleCls}`}
          title={bookmark.title}
        >
          {bookmark.title}
        </button>
        <div
          className={`flex items-center gap-1 ${compact ? 'mt-1' : 'mt-1.5'}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
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
        {bookmark.description && (
          <p
            className={`mt-1 text-[11px] leading-[1.45] text-ink3 ${
              compact ? 'line-clamp-2' : 'line-clamp-2'
            }`}
            title={bookmark.description}
          >
            {bookmark.description}
          </p>
        )}
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
