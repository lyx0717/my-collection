import { ArrowUpRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { BookCardData } from './demo'
import './book-card.css'

export type BookHinge = 'left' | 'right' | 'top'
export type BookMotion = 'snappy' | 'default' | 'soft'

export interface BookCardProps extends BookCardData {
  angle?: number
  pages?: number
  hinge?: BookHinge
  shadow?: number
  motion?: BookMotion
  open?: boolean
  interactive?: boolean
  onActivate?: () => void
}

const MOTION: Record<BookMotion, { dur: string; ease: string }> = {
  snappy: { dur: '300ms', ease: 'cubic-bezier(0.25, 1.16, 0.4, 1)' },
  default: { dur: '420ms', ease: 'cubic-bezier(0.3, 1.2, 0.5, 1)' },
  soft: { dur: '540ms', ease: 'cubic-bezier(0.34, 1.1, 0.5, 1)' },
}

const PAGE_LINES = [
  '把散落的链接收进一个干净的收藏夹，',
  '常用的放在最上面，偶尔翻的留在下面。',
  '每条都保留原始标题和域名，',
  '需要的时候，一键回到最初的样子。',
  '先按主题分组，再按最近使用排序。',
  '做完的东西别丢，按季度收好。',
]
const PAGE_TITLES = ['收藏', '整理', '回看', '归档', '索引', '备份']

/**
 * 一张会翻开的方形卡片。
 *
 * 封面保留普通产品卡的全部内容；纸页和背板只是装饰，aria-hidden。
 * 层高 translateZ((N+1-n)*0.6px) 避免共面闪烁；角度 A*0.7^n。
 */
export default function BookCard({
  title,
  desc,
  meta,
  metaRight,
  icon,
  accent,
  tint,
  angle = 42,
  pages = 4,
  hinge = 'left',
  shadow = 1,
  motion = 'default',
  open = false,
  interactive = true,
  onActivate,
}: BookCardProps) {
  const feel = MOTION[motion]
  const style = {
    '--book-pages': pages,
    '--book-dur': feel.dur,
    '--book-ease': feel.ease,
    '--book-shadow': shadow,
    '--ry': hinge === 'right' ? 1 : hinge === 'left' ? -1 : 0,
    '--rx': hinge === 'top' ? 1 : 0,
  } as CSSProperties

  const angleFor = (n: number) => angle * Math.pow(0.7, n)
  const layerStyle = (n: number): CSSProperties => {
    const gap = angleFor(n - 1) - angleFor(n)
    const shade = Math.max(0, Math.min(1, gap / 6)) * Math.max(0, 1 - gap / 30)
    return {
      '--angle': angleFor(n),
      '--z': `${(pages + 1 - n) * 0.6}px`,
      '--i': n,
      '--shade': shade,
    } as CSSProperties
  }

  const content = (
    <>
      <span className="bookcard__shadows" aria-hidden="true">
        <span className="bookcard__shadow bookcard__shadow--rest" />
        <span className="bookcard__shadow bookcard__shadow--open" />
      </span>

      <span className="bookcard__scene">
        <span className="bookcard__body">
          <span className="bookcard__layer bookcard__cover" style={layerStyle(0)}>
            <span className="bookcard__cover-inner">
              <span className="bookcard__top">
                <span
                  className="bookcard__icon"
                  style={{ background: tint, color: accent }}
                >
                  {icon}
                </span>
                <span className="bookcard__arrow">
                  <ArrowUpRight size={17} strokeWidth={1.8} />
                </span>
              </span>
              <span className="bookcard__title">{title}</span>
              <span className="bookcard__desc">{desc}</span>
              <span className="bookcard__foot">
                <span>{meta}</span>
                <span>{metaRight}</span>
              </span>
            </span>
          </span>

          {Array.from({ length: pages }, (_, index) => {
            const n = index + 1
            return (
              <span
                key={n}
                className="bookcard__layer bookcard__page"
                style={layerStyle(n)}
                aria-hidden="true"
              >
                <span className="bookcard__page-inner">
                  <span className="bookcard__page-shade" />
                  <span className="bookcard__page-head">
                    第 {n} 页 · {PAGE_TITLES[(n - 1) % PAGE_TITLES.length]}
                  </span>
                  <span className="bookcard__page-lines">
                    {PAGE_LINES.map((line, index) => (
                      <span key={index} className="bookcard__page-line">
                        {line}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            )
          })}

          <span
            className="bookcard__layer bookcard__board"
            style={{ '--angle': 0, '--z': '0px', '--i': pages + 1 } as CSSProperties}
            aria-hidden="true"
          />
        </span>
      </span>
    </>
  )

  if (!interactive) {
    return (
      <div
        className={`bookcard bookcard--${hinge}${open ? ' is-open' : ''} is-inert`}
        style={style}
        aria-hidden="true"
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`bookcard bookcard--${hinge}${open ? ' is-open' : ''}`}
      style={style}
      onClick={onActivate}
    >
      {content}
    </button>
  )
}
