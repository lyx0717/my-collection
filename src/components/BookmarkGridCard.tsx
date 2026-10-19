import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, Trash2 } from 'lucide-react'
import type { Bookmark } from '../types'
import { letterColor } from '../lib/color'
import { badgeText } from '../lib/badge'
import { useFaviconSrc } from '../hooks/useFavicon'

interface BookmarkGridCardProps {
  bookmark: Bookmark
  compact?: boolean
  sortable?: boolean
  onOpen: (bm: Bookmark) => void
  onEdit: (bm: Bookmark) => void
  onDelete: (bm: Bookmark) => void
}

/**
 * 网格卡片：logo 在左、文字在右的横向结构。
 *
 * 为什么从「封面在上、文字在下」改成横向：
 * · 纵向结构下封面独占 92~128px，153 条时整页被拉到十几屏，
 *   而书签导航的核心动作是「扫一眼标题认出来」，不是欣赏封面；
 * · 5 列栅格单卡仅约 200px 宽，纵向时封面占掉一半宽度、
 *   标题被挤成两三行，反而更难扫读；
 * · 横向后 logo / 标题 / 域名 / 描述收在同一条视觉轴上，
 *   视线只需横移，符合「扫」的阅读方式。
 *
 * 颜色策略：一屏 20+ 张卡，若每张都按域名铺一个彩色 logo 底或彩色封面，
 * 页面会变成万花筒，标题被彻底淹没。故 logo 容器一律用中性弱化底
 * （--logo-tile-bg），域名差异只由首字本身的颜色暗示。
 *
 * 溢出防线（窄屏 / 长标题 / 多语言域名都靠这几条兜住）：
 * · 文字列 min-w-0 flex-1 —— 允许收缩，这是 flex 布局里防撑破的关键；
 * · 标题 line-clamp-1/2、描述 line-clamp-2、域名 truncate，
 *   三层各自兜底，任何一层都不会把卡片顶高或顶宽；
 * · logo 固定尺寸且 shrink-0，不参与压缩，保证图形不变形。
 */
export default function BookmarkGridCard({
  bookmark,
  compact = false,
  sortable = false,
  onOpen,
  onEdit,
  onDelete,
}: BookmarkGridCardProps) {
  const { src, failed, handleError } = useFaviconSrc(bookmark.domain, bookmark.faviconUrl)
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: bookmark.id,
    disabled: !sortable,
  })

  // 圆角两档统一 10px：logo 容器尺寸分档（视觉层级），圆角不分 ——
  // 同一屏里出现两种圆角会读成两种控件。
  const logoBox = compact ? 'h-9 w-9 rounded-[10px]' : 'h-11 w-11 rounded-[10px]'
  // 图片铺满容器：外框已经有 overflow-hidden + object-contain 的按比例缩放，
  // 留内边距只会让图标显得比容器小一圈。非正方形图标自动收进可视区居中。
  const logoImg = 'h-full w-full object-contain'
  // 文字 logo 随容器同步放大：h-9(36px)→19px / h-11(44px)→23px，
  // 约 0.53 倍容器边长，首字在方块里视觉重量与图片 logo 相当。
  const letter = compact ? 'text-[19px]' : 'text-[23px]'
  const gap = compact ? 'gap-2.5' : 'gap-3'
  const pad = compact ? 'p-2.5' : 'p-3'

  return (
    <article
      ref={setNodeRef}
      style={sortable ? { transform: CSS.Transform.toString(transform), transition } : undefined}
      className={`glass-card group relative flex touch-none items-start overflow-hidden rounded-[16px] border transition-[transform,box-shadow,border-color,background-color] duration-[var(--dur-2)] ease-[var(--ease-out)] hover:-translate-y-[1.5px] ${pad} ${gap} ${
        isDragging ? 'z-10 opacity-70 ring-2 ring-accent/50' : ''
      }`}
      {...(sortable ? { ...attributes, ...listeners } : {})}
    >
      {/* 有封面时降为底层衬底：保留数据但压到几乎不抢视线。
          opacity-[0.16] + 遮罩渐变，保证上层文字始终可读。 */}
      {bookmark.cover && (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={bookmark.cover}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.16]"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-[var(--glass-bg-card)] from-[42%] to-transparent" />
        </span>
      )}

      {/* 左：logo。固定尺寸 + shrink-0，图形永不被压缩变形。
          无边框：容器底色已是弱化色块，再描一道边会显得「套了个框」，
          边界完全由底色与周围卡片对比承担即可。 */}
      <span
        className={`relative flex ${logoBox} shrink-0 items-center justify-center overflow-hidden`}
        style={{ background: 'var(--logo-tile-bg)' }}
      >
        {!failed && src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={handleError}
            className={`${logoImg} object-contain`}
          />
        ) : failed ? (
          // 只有首字保留彩色，底色统一为中性 —— 色彩暗示而非色块
          <span className={`font-bold ${letter}`} style={{ color: letterColor(bookmark.domain).fg }}>
            {badgeText(bookmark.domain, bookmark.title)}
          </span>
        ) : (
          <span className="h-3 w-3 animate-pulse rounded-full bg-line2" />
        )}
      </span>

      {/* 右：文字列。min-w-0 是防溢出关键，flex-1 吃掉剩余空间 */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <button
          onClick={() => onOpen(bookmark)}
          title={bookmark.title}
          className={`min-w-0 text-left leading-[1.35] font-semibold text-ink transition-colors hover:text-accent ${
            compact ? 'line-clamp-1 text-[13.5px]' : 'line-clamp-2 text-[14.5px]'
          }`}
        >
          {bookmark.title}
        </button>

        <div className="mt-1 flex min-w-0 items-center">
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink3">{bookmark.domain}</span>
        </div>

        {bookmark.description && (
          <p
            title={bookmark.description}
            className="mt-1 line-clamp-2 min-w-0 text-[12px] leading-[1.45] text-ink3"
          >
            {bookmark.description}
          </p>
        )}
      </div>

      {/* 编辑 / 删除：绝对定位浮在卡片右上角，不占文字列布局。
          曾经它们排在域名行里，opacity:0 只改绘制不改布局，白占 50px + 6px 间距，
          143px 的文字列只剩 87px 给域名 —— 148 条里 36% 被截成半个词。
          代价是 hover 时按钮会盖住标题尾端，这是「动作随悬停浮出」的常规取舍。

          pointer-events：不可见时也要禁用命中 —— opacity:0 只是看不见，
          那块 52×24 的区域照样能点中，用户会在卡片空白处莫名其妙打开编辑框。 */}
      <span
        className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-100 transition-opacity lg:pointer-events-none lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:opacity-100"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onEdit(bookmark)}
          aria-label={`编辑 ${bookmark.title}`}
          className="flex h-6 w-6 items-center justify-center rounded-md text-ink3 hover:bg-canvas hover:text-ink"
        >
          <Pencil size={compact ? 11.5 : 12.5} />
        </button>
        <button
          onClick={() => onDelete(bookmark)}
          aria-label={`删除 ${bookmark.title}`}
          className="flex h-6 w-6 items-center justify-center rounded-md text-ink3 hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={compact ? 11.5 : 12.5} />
        </button>
      </span>
    </article>
  )
}
