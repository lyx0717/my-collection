import { useEffect, useMemo, useState } from 'react'
import { domainLetter, letterColor } from '../lib/color'

interface FaviconProps {
  domain: string
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
  sm: 'text-[9px]',
  md: 'text-[13px]',
}

/** favicon 三级兜底：抓取图标 → favicon.im → 站点 /favicon.ico → 首字母色块 */
export default function Favicon({ domain, faviconUrl, size = 'md', className = '' }: FaviconProps) {
  const sources = useMemo(
    () =>
      [
        faviconUrl,
        domain ? `https://favicon.im/${domain}?larger=true` : null,
        domain ? `https://${domain}/favicon.ico` : null,
      ].filter((s): s is string => Boolean(s)),
    [domain, faviconUrl],
  )
  const [level, setLevel] = useState(0)

  useEffect(() => {
    setLevel(0)
  }, [sources.join('|')])

  const color = letterColor(domain || '?')
  const failed = level >= sources.length

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${SIZES[size]} ${className}`}
      style={{ background: failed ? color.bg : '#F4F3EF' }}
    >
      {!failed ? (
        <img
          src={sources[level]}
          alt=""
          loading="lazy"
          onError={() => setLevel((v) => v + 1)}
          className={`absolute ${IMG_SIZES[size]}`}
        />
      ) : (
        <span className={`font-bold ${LETTER_SIZES[size]}`} style={{ color: color.fg }}>
          {domainLetter(domain)}
        </span>
      )}
    </span>
  )
}
