import type { Bookmark } from '../types'
import { letterColor } from '../lib/color'
import { badgeText } from '../lib/badge'
import { useFaviconSrc } from '../hooks/useFavicon'

interface BookmarkTileProps {
  bookmark: Bookmark
  onOpen: (bm: Bookmark) => void
}

/** 极简磁贴：大图标 + 标题；图标失败时显示彩色文字徽章 */
export default function BookmarkTile({ bookmark, onOpen }: BookmarkTileProps) {
  const { src, failed, handleError } = useFaviconSrc(bookmark.domain, bookmark.faviconUrl)
  const color = letterColor(bookmark.domain)

  return (
    <button
      onClick={() => onOpen(bookmark)}
      title={bookmark.title}
      className="tile-shell group flex min-h-[100px] min-w-[80px] flex-col items-center gap-2 rounded-2xl border border-transparent px-2.5 py-4 text-center transition-colors hover:border-line hover:bg-surface"
    >
      <span
        className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border shadow-[0_2px_8px_-2px_rgba(28,27,25,.12)] transition-transform group-hover:scale-105"
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
            className="h-8 w-8 rounded-lg"
          />
        ) : failed ? (
          <span className="text-[20px] font-bold" style={{ color: color.fg }}>
            {badgeText(bookmark.domain, bookmark.title)}
          </span>
        ) : (
          <span className="h-3 w-3 animate-pulse rounded-full bg-line2" />
        )}
        {bookmark.starred && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-star" />
        )}
      </span>
      <span className="line-clamp-2 w-full break-words text-[12px] leading-[1.35] text-ink2 group-hover:text-ink">
        {bookmark.title}
      </span>
    </button>
  )
}
