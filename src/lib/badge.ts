const CJK = /[一-鿿]/

/**
 * favicon 获取失败时的文字徽章内容。
 * 规则：标题 emoji/中文首字 → 英文/数字取域名主体首字母。
 */
export function badgeText(domain: string, title?: string): string {
  const t = (title ?? '').trim()

  // emoji 开头（含变体选择符）
  const emojiMatch = t.match(/^\p{Extended_Pictographic}/u)
  if (emojiMatch) return emojiMatch[0]

  // 标题中的第一个汉字（跳过英文/符号前缀）
  const cjkChar = t.match(CJK)
  if (cjkChar) return cjkChar[0]

  // 取域名主体首字母/数字（跳过 www）
  const host = domain.replace(/^www\./, '').split('.')[0] || ''
  if (/^\d/.test(host)) return host.slice(0, 2)
  const firstChar = [...host][0]
  return firstChar ? firstChar.toUpperCase() : '?'
}
