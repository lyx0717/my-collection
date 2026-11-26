import BookCard from './BookCard'
import { BOOK_CARDS } from './demo'

/**
 * 总览页封面：书架墙面上一张平放的产品卡。
 * 外层卡片 hover 时传 active，卡片翻开；卡片自身不接收指针事件。
 */
export default function BookCover({ active = false }: { active?: boolean }) {
  return (
    <div className="fx-bookcover" aria-hidden="true">
      <BookCard {...BOOK_CARDS[0]} interactive={false} open={active} />
      <div className="fx-bookcover__meta">
        <span>003</span>
        <span>CSS 3D / 4 PAGES</span>
      </div>
      <div className="fx-bookcover__hint">HOVER TO OPEN</div>
    </div>
  )
}
