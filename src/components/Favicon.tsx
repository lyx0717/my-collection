import { useEffect, useMemo, useState } from 'react'
import { letterColor } from '../lib/color'
import { badgeText } from '../lib/badge'
import { isInternalDomain, probeIcon } from '../lib/favicon'

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

/** favicon：内网直接文字徽章；外网探测 favicon.im 有效性，失败直取站点 /favicon.ico，再失败用徽章 */
export default function Favicon({ domain, title, faviconUrl, size = 'md', className = '' }: FaviconProps) {
  const imSource = useMemo(
    () => (domain ? `https://favicon.im/${domain}?larger=true` : ''),
    [domain],
  )
  const directSource = useMemo(
    () => (domain ? `https://${domain}/favicon.ico` : ''),
    [domain],
  )

  const [src, setSrc] = useState<string>('')
  const [badge, setBadge] = useState(false)

  useEffect(() => {
    let cancelled = false
    setBadge(false)

    // 自定义图标直接尝试
    if (faviconUrl) {
      setSrc(faviconUrl)
      return () => {
        cancelled = true
      }
    }
    // 内网地址：favicon.im 只会给占位图，直接徽章
    if (isInternalDomain(domain) || !imSource) {
      setBadge(true)
      return () => {
        cancelled = true
      }
    }
    // 外网：先探测 favicon.im 是否真有图
    setSrc('')
    probeIcon(imSource).then((ok) => {
      if (cancelled) return
      setSrc(ok ? imSource : directSource)
    })
    return () => {
      cancelled = true
    }
  }, [domain, faviconUrl, imSource, directSource])

  const handleError = () => {
    if (src === faviconUrl) {
      // 自定义图标失败 → 探测 favicon.im
      probeIcon(imSource).then((ok) => setSrc(ok ? imSource : directSource))
    } else if (src === imSource) {
      setSrc(directSource)
    } else {
      setBadge(true)
    }
  }

  const color = letterColor(domain || '?')

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden font-bold ${SIZES[size]} ${className}`}
      style={{ background: badge ? color.bg : '#F4F3EF' }}
    >
      {badge ? (
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
