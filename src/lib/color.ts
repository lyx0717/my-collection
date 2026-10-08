/**
 * 域名 → 稳定的配色索引。
 * 实际色值以 CSS 变量形式定义在 index.css（亮/暗双主题各一套），
 * 这里只返回 var() 引用 —— 主题切换零 JS 参与。
 */
const BADGE_COUNT = 12
const COVER_COUNT = 8

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** favicon 文字徽章配色 */
export function letterColor(domain: string): { bg: string; fg: string } {
  const i = hashString(domain) % BADGE_COUNT
  return { bg: `var(--badge-bg-${i})`, fg: `var(--badge-fg-${i})` }
}

/** 网格封面渐变 */
export function coverGradient(domain: string): string {
  const i = hashString(domain) % COVER_COUNT
  return `linear-gradient(135deg, var(--cover-a-${i}), var(--cover-b-${i}))`
}

/** 字母兜底：域名首字符（优先英文首字母） */
export function domainLetter(domain: string): string {
  const stripped = domain.replace(/^[0-9.]+/, '')
  return (stripped[0] ?? '?').toUpperCase()
}
