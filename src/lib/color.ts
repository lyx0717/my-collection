/**
 * 域名 → 稳定的配色索引。
 * 实际色值以 CSS 变量形式定义在 index.css（亮/暗双主题各一套），
 * 这里只返回 var() 引用 —— 主题切换零 JS 参与。
 *
 * 徽章配色只用于「首字取色」，底色统一走 --logo-tile-bg 中性底：
 * 一屏 20+ 张卡若各自铺一个彩色块，页面会变成万花筒。
 */
const BADGE_COUNT = 12

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** favicon 文字徽章配色（只取前景色，背景统一中性） */
export function letterColor(domain: string): { bg: string; fg: string } {
  const i = hashString(domain) % BADGE_COUNT
  return { bg: `var(--logo-tile-bg)`, fg: `var(--badge-fg-${i})` }
}

/** 字母兜底：域名首字符（优先英文首字母） */
export function domainLetter(domain: string): string {
  const stripped = domain.replace(/^[0-9.]+/, '')
  return (stripped[0] ?? '?').toUpperCase()
}
