import { useState } from 'react'
import { Star } from 'lucide-react'
import type { Bookmark } from '../types'
import { coverGradient, domainLetter } from '../lib/color'

interface BookmarkGridCardProps {
  bookmark: Bookmark
  onToggleStar: (id: string) => void
  onTagClick?: (tag: string) => void
  onOpen: (bm: Bookmark) => void
}

export default function BookmarkGridCard({
  bookmark,
  onToggleStar,
  onTagClick,
  onOpen,
}: BookmarkGridCardProps) {
  const [logoFailed, setLogoFailed] = useState(false)

  return (
    <button
      onClick={() => onOpen(bookmark)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-[0_1px_2px_rgba(28,27,25,.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(28,27,25,.18),0_2px_6px_rgba(28,27,25,.05)]"
    >
      <div
        className="relative flex h-[128px] items-center justify-center"
        style={{ background: coverGradient(bookmark.domain) }}
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
            <span className="relative flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[15px] bg-white/15 backdrop-blur-sm">
              {!logoFailed ? (
                <img
                  src={`https://favicon.im/${bookmark.domain}?larger=true`}
                  alt=""
                  loading="lazy"
                  onError={() => setLogoFailed(true)}
                  className="h-7 w-7 rounded-md"
                />
              ) : (
                <span className="text-[20px] font-bold text-white">
                  {domainLetter(bookmark.domain)}
                </span>
              )}
            </span>
          </>
        )}

        <span
          role="switch"
          aria-checked={bookmark.starred}
          aria-label={bookmark.starred ? '取消星标' : '加星标'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar(bookmark.id)
          }}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/85 backdrop-blur-sm transition-transform hover:scale-105"
        >
          <Star
            size={14}
            className={bookmark.starred ? 'fill-star text-star' : 'text-[#7c786f]'}
          />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-3.5 py-3">
        <div className="line-clamp-2 min-h-[38px] text-[13.5px] font-semibold leading-[1.4]">
          {bookmark.title}
        </div>
        <div className="mt-1.5 truncate text-[11.5px] text-ink3">{bookmark.domain}</div>
        {bookmark.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {bookmark.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                role="link"
                onClick={(e) => {
                  e.stopPropagation()
                  onTagClick?.(tag)
                }}
                className="rounded-md border border-line bg-canvas px-[7px] py-[1.5px] text-[10.5px] text-ink2"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
