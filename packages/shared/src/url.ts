/**
 * URL 规范化与去重键。
 *
 * 前后端共用同一份实现：服务端算出的 dedupe_key 必须与客户端完全一致，
 * 否则「同一链接只能存一条」的判定在两端会对不上。
 * 只依赖 WHATWG URL，浏览器与 Node 22 原生可用。
 */

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
