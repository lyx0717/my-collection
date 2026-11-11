/**
 * URL 规范化与去重键。
 *
 * 前后端共用同一份实现：服务端算出的 dedupe_key 必须与客户端完全一致，
 * 否则「同一链接只能存一条」的判定在两端会对不上。
 * 只依赖 WHATWG URL，浏览器与 Node 22 原生可用。
 */

/**
 * 补全协议、域名小写去 www、去 hash。
 *
 * 保留用户写的末尾斜杠：`/tstc-ui` 与 `/tstc-ui/` 对不少服务端是两条路径，
 * 有的站点（path 型 SPA）会因此 301 到另一个端口甚至 404，不能替用户改写。
 * 「同一链接只存一条」的判断交给 dedupeKey，它在算键时才抹掉末尾斜杠。
 */
export function normalizeUrl(raw: string): string {
  let v = raw.trim()
  if (!v) return ''
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`
  try {
    const u = new URL(v)
    u.hash = ''
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '')
    return u.toString()
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

/**
 * 去重键：在 normalizeUrl 基础上抹掉末尾斜杠（无 query 时），
 * 让 `/a` 与 `/a/` 判为同一条。存储与打开的 URL 不受影响。
 */
export function dedupeKey(url: string): string {
  const v = normalizeUrl(url)
  try {
    const u = new URL(v)
    return u.toString().replace(/\/$/, (m) => (u.search ? m : ''))
  } catch {
    return v
  }
}
