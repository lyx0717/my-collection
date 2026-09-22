/**
 * logo 获取失败时的文字徽章：优先「名称/标题」首个有效字符。
 * 规则：标题 emoji → 标题首个字母/数字/汉字 → 域名首字母兜底。
 */
export function badgeText(domain: string, title?: string): string {
  const t = (title ?? '').trim()
  if (!t) {
    const host = domain.replace(/^www\./, '').split('.')[0] || ''
    const first = [...host][0]
    return first ? first.toUpperCase() : '?'
  }

  const emojiMatch = t.match(/^\p{Extended_Pictographic}/u)
  if (emojiMatch) return emojiMatch[0]

  const ch = t.match(/[\p{L}\p{N}]/u)
  return ch ? ch[0] : [...t][0]
}
