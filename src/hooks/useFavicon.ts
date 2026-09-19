import { useEffect, useMemo, useState } from 'react'
import { faviconSources } from '../lib/favicon'

/** 按候选链解析 favicon：全部失败后 failed=true，由调用方渲染文字徽章 */
export function useFaviconSrc(domain: string, faviconUrl?: string) {
  const sources = useMemo(() => faviconSources(domain, faviconUrl), [domain, faviconUrl])
  const key = sources.join('\n')
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [key])

  const failed = index >= sources.length
  const src = failed ? '' : sources[index]

  return {
    src,
    failed,
    handleError: () => setIndex((i) => i + 1),
  }
}
