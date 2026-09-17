import { useState } from 'react'
import type { Item } from '../types'
import { CATEGORIES } from '../lib/categories'
import { formatAccession } from '../utils/filter'

interface CoverProps {
  item: Item
  accession?: number
  /** 卡片大封面 / 小缩略图 */
  size?: 'lg' | 'sm'
  className?: string
}

/**
 * 排版式藏品封面：分类色相渐变 + 宋体水印大字 + 藏品登记号。
 * 用户填了封面图则显示真图，加载失败自动降级回排版封面。
 */
export default function Cover({ item, accession, size = 'lg', className = '' }: CoverProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const meta = CATEGORIES[item.category]
  const showImage = Boolean(item.cover) && !imgFailed

  if (size === 'sm') {
    return (
      <div
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ink-700 ${className}`}
        style={{ background: meta.gradient }}
      >
        {showImage ? (
          <img
            src={item.cover}
            alt=""
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-serif text-xl" style={{ color: meta.tint, opacity: 0.55 }}>
            {meta.mark}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden ${className}`}
      style={showImage ? undefined : { background: meta.gradient }}
    >
      {showImage ? (
        <img
          src={item.cover}
          alt={item.title}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <>
          {/* 顶光 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(255,255,255,0.07), transparent 70%)',
            }}
          />
          <span className="cover-watermark" style={{ color: meta.tint }}>
            {meta.mark}
          </span>
        </>
      )}

      {/* 底部压暗，保证登记号可读 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <span className="rounded-sm border border-gold/25 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.18em] text-gold/90 backdrop-blur-sm">
          {accession ? formatAccession(accession) : meta.en}
        </span>
        <span
          className="flex h-6 w-6 items-center justify-center rounded-sm border border-white/15 bg-black/25 backdrop-blur-sm"
          style={{ color: meta.tint }}
        >
          <meta.icon size={12} strokeWidth={1.6} />
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/45">{meta.en}</p>
      </div>
    </div>
  )
}
