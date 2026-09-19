/**
 * 内网/保留地址：外部 favicon 服务基本取不到，直接用文字徽章。
 */
export function isInternalDomain(domain: string): boolean {
  if (!domain) return true
  if (domain === 'localhost' || domain.endsWith('.local') || domain.endsWith('.lan')) return true
  const m = domain.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::\d+)?$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 127) return true
  }
  if (!domain.includes('.')) return true
  return false
}

/**
 * 图标候选链：自定义图标 → 站点 /favicon.ico → 文字徽章。
 * 不再走 favicon.im：它对取不到图的域名会返回占位图，onerror 不触发。
 */
export function faviconSources(domain: string, faviconUrl?: string): string[] {
  const list: string[] = []
  if (faviconUrl) list.push(faviconUrl)
  if (domain && !isInternalDomain(domain)) {
    const ico = `https://${domain}/favicon.ico`
    if (!list.includes(ico)) list.push(ico)
  }
  return list
}
