import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Star } from 'lucide-react'
import type { Bookmark } from '../types'
import { letterColor } from '../lib/color'
import { badgeText } from '../lib/badge'
import { useFaviconSrc } from '../hooks/useFavicon'

interface BookmarkTileProps {
  bookmark: Bookmark
  sortable?: boolean
  onOpen: (bm: Bookmark) => void
}

/** 极简磁贴：大图标 + 标题；支持拖拽排序；图标失败显示彩色文字徽章 */
export default function BookmarkTile({ bookmark, sortable = false, onOpen }: BookmarkTileProps) {
  const { src, failed, handleError } = useFaviconSrc(bookmark.domain, bookmark.faviconUrl)
  const color = letterColor(bookmark.domain)
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: bookmark.id,
    disabled: !sortable,
  })

  return (
    <div
      ref={setNodeRef}
      style={sortable ? { transform: CSS.Transform.toString(transform), transition } : undefined}
      className={`tile-shell group flex min-h-[100px] min-w-[80px] touch-none flex-col items-center gap-2 rounded-2xl border border-transparent px-2.5 py-4 text-center transition-colors hover:border-line hover:bg-surface ${
        isDragging ? 'z-10 opacity-70 ring-2 ring-accent/50' : ''
      }`}
      {...(sortable ? { ...attributes, ...listeners } : {})}
    >
      <button
        onClick={() => onOpen(bookmark)}
        onPointerDown={(e) => e.stopPropagation()}
        title={bookmark.description ? `${bookmark.title}\n${bookmark.description}` : bookmark.title}
        aria-label={`打开 ${bookmark.title}`}
        className="relative flex h-14 w-14 items-center justify-center transition-transform group-hover:scale-105"
      >
        <span
          className="absolute inset-0 overflow-hidden rounded-2xl border shadow-[0_2px_8px_-2px_rgba(28,27,25,.12)]"
          style={{
            background: failed ? color.bg : '#fff',
            borderColor: failed ? color.bg : 'var(--color-line)',
          }}
        >
          {!failed && src ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              onError={handleError}
              className="h-full w-full rounded-2xl p-3"
            />
          ) : failed ? (
            <span
              className="flex h-full w-full items-center justify-center text-[20px] font-bold"
              style={{ color: color.fg }}
            >
              {badgeText(bookmark.domain, bookmark.title)}
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-3 w-3 animate-pulse rounded-full bg-line2" />
            </span>
          )}
        </span>
        {bookmark.starred && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line bg-surface shadow-sm"
            aria-label="已星标"
          >
            <Star size={11} className="fill-star text-star" />
          </span>
        )}
      </button>
      <span className="line-clamp-2 w-full break-words text-[12px] leading-[1.35] text-ink2 group-hover:text-ink">
        {bookmark.title}
      </span>
    </div>
  )
}
