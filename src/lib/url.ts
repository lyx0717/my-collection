/** 补全协议、提取域名（去 www） */
export function normalizeUrl(raw: string): string {
  let v = raw.trim()
  if (!v) return ''
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`
  try {
    const u = new URL(v)
    u.hash = ''
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '')
    return u.toString().replace(/\/$/, (m) => (u.search ? m : ''))
  } catch {
    return v
  }
}

export function extractDomain(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
    return u.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function isValidUrl(url: string): boolean {
  if (!/^https?:\/\/.+/i.test(url)) return false
  try {
    const u = new URL(url)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

/** 去重键：去 www、去 hash、去末尾斜杠后的 URL */
export function dedupeKey(url: string): string {
  return normalizeUrl(url)
}
