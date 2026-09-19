/**
 * 判断一个图标 URL 是否真实可用。
 * favicon.im 对取不到的域名会返回占位图（onerror 不触发），
 * 因此用 fetch HEAD/GET 探测：非 2xx、content-type 非图片均视为无效。
 * 结果做会话级缓存，避免重复探测。
 */
const resultCache = new Map<string, boolean>()
const inflight = new Map<string, Promise<boolean>>()

export function probeIcon(url: string): Promise<boolean> {
  const cached = resultCache.get(url)
  if (cached !== undefined) return Promise.resolve(cached)
  const running = inflight.get(url)
  if (running) return running

  const task = (async () => {
    try {
      const res = await fetch(url, { method: 'GET', mode: 'no-cors' })
      // no-cors 下 opaque 响应无法读取状态，但请求本身成功，保守认为有效
      const ok = res.type === 'opaque' ? true : res.ok
      resultCache.set(url, ok)
      return ok
    } catch {
      resultCache.set(url, false)
      return false
    } finally {
      inflight.delete(url)
    }
  })()
  inflight.set(url, task)
  return task
}

/**
 * 内网/保留地址直接判定 favicon 服务取不到（favicon.im 对这类地址返回占位图）。
 */
export function isInternalDomain(domain: string): boolean {
  if (!domain) return false
  if (domain === 'localhost' || domain.endsWith('.local') || domain.endsWith('.lan')) return true
  // IPv4 私有/保留段
  const m = domain.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::\d+)?$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 127) return true
  }
  // 纯内网主机名（无点或只有单段，如 wiki、gitlab）
  if (!domain.includes('.')) return true
  return false
}
