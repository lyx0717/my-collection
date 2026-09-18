/** 域名 → 稳定的柔和底色/深色文字对（favicon 兜底） */
const LETTER_PALETTES: Array<{ bg: string; fg: string }> = [
  { bg: '#F4F3EF', fg: '#1F2328' },
  { bg: '#E7F0FF', fg: '#0057A4' },
  { bg: '#E2F3FF', fg: '#4E5BD6' },
  { bg: '#DFF8F0', fg: '#0E9F8E' },
  { bg: '#FCE7F0', fg: '#D13D7A' },
  { bg: '#FFF6E2', fg: '#B8860B' },
  { bg: '#E0F0FF', fg: '#0086B8' },
  { bg: '#FFEEE5', fg: '#E8741E' },
  { bg: '#EEEAFB', fg: '#6B4FE0' },
  { bg: '#EEF9EC', fg: '#5BA829' },
  { bg: '#FDECEA', fg: '#C0392B' },
  { bg: '#F3EFE6', fg: '#8A6D3B' },
]

/** 网格封面的品牌渐变（无 og:image 时） */
const GRADIENTS = [
  'linear-gradient(135deg,#24292F,#4B5563)',
  'linear-gradient(135deg,#EA4C89,#C2266B)',
  'linear-gradient(135deg,#38BDF8,#0EA5E9)',
  'linear-gradient(135deg,#06B6D4,#0E7490)',
  'linear-gradient(135deg,#FF6600,#C2410C)',
  'linear-gradient(135deg,#5C6AC4,#3247AE)',
  'linear-gradient(135deg,#22C55E,#15803D)',
  'linear-gradient(135deg,#0057A4,#0C3E75)',
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function letterColor(domain: string): { bg: string; fg: string } {
  return LETTER_PALETTES[hashString(domain) % LETTER_PALETTES.length]
}

export function coverGradient(domain: string): string {
  return GRADIENTS[hashString(domain) % GRADIENTS.length]
}

/** 字母兜底：域名首字符（优先英文首字母） */
export function domainLetter(domain: string): string {
  const stripped = domain.replace(/^[0-9.]+/, '')
  return (stripped[0] ?? '?').toUpperCase()
}
