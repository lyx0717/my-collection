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
    <div
      className="tile-shell group flex min-h-[100px] min-w-[80px] flex-col items-center gap-2 rounded-[12px] border px-2.5 py-4 text-center transition-[transform,background-color,border-color,box-shadow] duration-[var(--dur-2)] ease-[var(--ease-out)] hover:-translate-y-[1.5px]"
    >
      <button
        onClick={() => onOpen(bookmark)}
        title={bookmark.description ? `${bookmark.title}\n${bookmark.description}` : bookmark.title}
        aria-label={`打开 ${bookmark.title}`}
        className="relative flex h-14 w-14 items-center justify-center transition-transform group-hover:scale-105"
      >
        <span
          className="absolute inset-0 overflow-hidden rounded-[12px] shadow-[0_2px_8px_-2px_rgba(30,40,60,.12)]"
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
              className="h-full w-full rounded-[8px]"
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
      </button>
      <span className="line-clamp-2 w-full break-words text-[12px] leading-[1.35] text-ink2 group-hover:text-ink">
        {bookmark.title}
      </span>
    </div>
  )
}
