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

const SIZES = {
  sm: 'h-6 w-6 rounded-md',
  md: 'h-[38px] w-[38px] rounded-[10px]',
}
const IMG_SIZES = {
  sm: 'h-3.5 w-3.5 rounded-sm',
  md: 'h-[21px] w-[21px] rounded',
}
const LETTER_SIZES = {
  sm: 'text-[11px]',
  md: 'text-[15px]',
}

/** favicon：自定义图标 → 站点 /favicon.ico → 文字徽章 */
export default function Favicon({ domain, title, faviconUrl, size = 'md', className = '' }: FaviconProps) {
  const { src, failed, handleError } = useFaviconSrc(domain, faviconUrl)
  const color = letterColor(domain || '?')

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden font-bold ${SIZES[size]} ${className}`}
      style={{ background: failed ? color.bg : '#F4F3EF' }}
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
          className={`absolute ${IMG_SIZES[size]}`}
        />
      ) : (
        <span className="h-3 w-3 animate-pulse rounded-full bg-line2" />
      )}
    </span>
  )
}
