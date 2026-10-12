import { letterColor } from '../lib/color'
import { badgeText } from '../lib/badge'
import { useFaviconSrc } from '../hooks/useFavicon'

interface FaviconProps {
  domain: string
  title?: string
  /** 抓取到的图标地址（Microlink logo 等），优先尝试 */
  faviconUrl?: string
  size?: 'sm' | 'md'
  className?: string
}

/**
 * 容器尺寸（外框不动，只改内层图标的取景）
 *
 * RADIUS 统一 10px：原先 sm 用 rounded-md(6px)、md 用 10px，
 * 同一枚图标在列表与弹窗里圆角不一致，视觉上像两种控件。
 * 圆角值抽成常量，两档共用，避免以后再分叉。
 */
const RADIUS = 'rounded-[10px]'

/** 外框：高宽固定，是卡片行高与栅格对齐的基准，不允许随内容变化 */
const SIZES = {
  sm: 'h-6 w-6',
  md: 'h-[38px] w-[38px]',
}

/**
 * 内层图标：撑满外框，用 object-contain 按原比例缩放。
 *
 * 原来 sm 是 3.5(14px) 放在 6(24px) 框里、md 是 21 放在 38 里，
 * 都留了两三成边距，图标显得比容器小一圈。
 *
 * object-contain 是这里的关键：图标铺满外框的同时**按原比例缩放**，
 * 遇到非正方形图标（有些站点 favicon 是长条）时也不会被拉变形，
 * 而是自动收进可视区居中 —— 这正是「撑满可用空间但不出现变形」的做法。
 * 若换成 object-fill / 默认的 fill，非正方形图标会被硬拉成正方形而失真。
 *
 * 两档尺寸已无差异（都撑满外框），故不按 size 分档。
 * 外框已有 overflow-hidden，图标圆角由外框裁切即可，
 * 内层不再单独设圆角，避免两层圆角叠加出的抗锯齿毛边。
 */
const IMG_CLS = 'h-full w-full object-contain'

const LETTER_SIZES = {
  sm: 'text-[12px]',
  md: 'text-[17px]',
}

/** favicon：自定义图标 → 站点 /favicon.ico → 文字徽章 */
export default function Favicon({ domain, title, faviconUrl, size = 'md', className = '' }: FaviconProps) {
  const { src, failed, handleError } = useFaviconSrc(domain, faviconUrl)
  const color = letterColor(domain || '?')

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden font-bold ${RADIUS} ${SIZES[size]} ${className}`}
      style={{ background: failed ? color.bg : 'var(--logo-tile-bg)' }}
    >
      {failed ? (
        <span
          className={`${LETTER_SIZES[size]} flex h-full w-full items-center justify-center`}
          style={{ color: color.fg }}
        >
          {badgeText(domain, title)}
        </span>
      ) : src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={handleError}
          className={IMG_CLS}
        />
      ) : (
        <span className="h-3 w-3 animate-pulse rounded-full bg-line2" />
      )}
    </span>
  )
}
