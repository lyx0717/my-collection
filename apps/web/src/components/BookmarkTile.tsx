import type { Bookmark } from '../types'
import { letterColor } from '../lib/color'
import { badgeText } from '../lib/badge'
import { useFaviconSrc } from '../hooks/useFavicon'

interface BookmarkTileProps {
  bookmark: Bookmark
  onOpen: (bm: Bookmark) => void
}

/**
 * 极简磁贴：大图标 + 标题；图标失败显示彩色文字徽章
 *
 * 纯浏览面：不提供编辑 / 删除 / 拖拽（动作统一收在列表视图）。
 *
 * 常态「无壳」，hover 才浮出玻璃卡片 —— 底色 / 描边 / 投影全交给
 * .tile-shell 的 CSS 规则控制。这里不再写 hover:bg-surface、
 * hover:border-line，否则 Tailwind 工具类会盖住样式表里的
 * --glass-bg-card-hover，两处真源打架。
 * 保留 border（无 border-transparent）：常态要一条透明边占位，
 * 否则 hover 时边框从 0 突变到 1px，元素会横向抖一下。
 */
export default function BookmarkTile({ bookmark, onOpen }: BookmarkTileProps) {
  const { src, failed, handleError } = useFaviconSrc(bookmark.domain, bookmark.faviconUrl)
  const color = letterColor(bookmark.domain)

  return (
    <a
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      title={bookmark.description ? `${bookmark.title}\n${bookmark.description}` : bookmark.title}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onOpen(bookmark)
      }}
      className="tile-shell group flex min-h-[100px] min-w-[80px] cursor-pointer flex-col items-center gap-2 rounded-[14px] border px-2.5 py-4 text-center no-underline transition-[background-color,border-color,box-shadow] duration-[var(--dur-2)] ease-[var(--ease-out)] focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
    >
      <span
        className="relative flex h-14 w-14 items-center justify-center transition-transform group-hover:scale-105"
      >
        <span
          className="absolute inset-0 overflow-hidden rounded-[9px] shadow-[0_1px_3px_-1px_rgba(30,40,60,.14)]"
          style={{
            background: failed ? color.bg : 'var(--surface)',
            borderColor: failed ? color.bg : 'var(--color-line)',
          }}
        >
          {!failed && src ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              onError={handleError}
              className="h-full w-full rounded-[9px]"
            />
          ) : failed ? (
            <span
              className="flex h-full w-full items-center justify-center text-[28px] font-bold"
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
      </span>
      <span className="line-clamp-2 w-full break-words text-[12px] leading-[1.35] text-ink2 group-hover:text-ink">
        {bookmark.title}
      </span>
    </a>
  )
}
