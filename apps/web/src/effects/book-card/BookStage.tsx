import BookCard, { type BookHinge, type BookMotion } from './BookCard'
import { BOOK_CARDS } from './demo'

export interface BookStageProps {
  angle: number
  pages: number
  hinge: BookHinge
  shadow: number
  motion: BookMotion
  allOpen: boolean
  onActivate: () => void
}

/**
 * 详情页的 4:5 墙面。桌面 2×2 四张卡；窄屏只留第一张，避免挤成邮票。
 */
export default function BookStage({
  angle,
  pages,
  hinge,
  shadow,
  motion,
  allOpen,
  onActivate,
}: BookStageProps) {
  return (
    <div className="fx-bookstage">
      <div className="fx-bookstage__meta">
        <span>003 / BOOK CARD</span>
        <span>CSS 3D · 280 × 280</span>
      </div>

      <div className="fx-bookgrid">
        {BOOK_CARDS.map((card) => (
          <BookCard
            key={card.id}
            {...card}
            angle={angle}
            pages={pages}
            hinge={hinge}
            shadow={shadow}
            motion={motion}
            open={allOpen}
            onActivate={onActivate}
          />
        ))}
      </div>

    </div>
  )
}
