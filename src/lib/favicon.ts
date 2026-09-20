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
 * 图标候选链（展示时解析，不依赖 Microlink 抓取）：
 * 历史/自定义 faviconUrl → 站点 /favicon.ico → DuckDuckGo ip3 → 文字徽章
 */
export function faviconSources(domain: string, faviconUrl?: string): string[] {
  const list: string[] = []
  if (faviconUrl) list.push(faviconUrl)
  if (!domain || isInternalDomain(domain)) return list
  const ico = `https://${domain}/favicon.ico`
  const ddg = `https://icons.duckduckgo.com/ip3/${domain}.ico`
  if (!list.includes(ico)) list.push(ico)
  if (!list.includes(ddg)) list.push(ddg)
  return list
}
