import { useEffect, useState } from 'react'
import type { Bookmark } from '../types'
import { letterColor } from '../lib/color'
import { badgeText } from '../lib/badge'
import { isInternalDomain, probeIcon } from '../lib/favicon'

interface BookmarkTileProps {
  bookmark: Bookmark
  onOpen: (bm: Bookmark) => void
}

/** 极简磁贴：大 favicon + 标题；图标失败/内网地址显示彩色文字徽章 */
export default function BookmarkTile({ bookmark, onOpen }: BookmarkTileProps) {
  const imSource = `https://favicon.im/${bookmark.domain}?larger=true`
  const directSource = `https://${bookmark.domain}/favicon.ico`
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    if (bookmark.faviconUrl) {
      setSrc(bookmark.faviconUrl)
    } else if (isInternalDomain(bookmark.domain)) {
      setFailed(true)
    } else {
      setSrc('')
      probeIcon(imSource).then((ok) => {
        if (!cancelled) setSrc(ok ? imSource : directSource)
      })
    }
    return () => {
      cancelled = true
    }
  }, [bookmark.domain, bookmark.faviconUrl, imSource, directSource])

  const handleError = () => {
    if (src === bookmark.faviconUrl) {
      probeIcon(imSource).then((ok) => setSrc(ok ? imSource : directSource))
    } else if (src === imSource) {
      setSrc(directSource)
    } else {
      setFailed(true)
    }
  }

  const color = letterColor(bookmark.domain)

  return (
    <button
      onClick={() => onOpen(bookmark)}
      title={bookmark.title}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-transparent px-2 py-4 text-center transition-colors hover:border-line hover:bg-surface"
    >
      <span
        className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border shadow-[0_2px_8px_-2px_rgba(28,27,25,.12)] transition-transform group-hover:scale-105"
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
            className="h-7 w-7 rounded-lg"
          />
        ) : failed ? (
          <span className="text-[18px] font-bold" style={{ color: color.fg }}>
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
