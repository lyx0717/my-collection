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

/** 网格封面：极浅色渐变，不抢 logo */
const COVER_GRADIENTS = [
  'linear-gradient(135deg,#EEF2F7,#E4EAF2)',
  'linear-gradient(135deg,#F7F0F3,#EFE6EC)',
  'linear-gradient(135deg,#EDF4F8,#E3EEF4)',
  'linear-gradient(135deg,#EDF6F3,#E3F0EB)',
  'linear-gradient(135deg,#F8F3EA,#F0E9DC)',
  'linear-gradient(135deg,#F0F0F8,#E8E8F3)',
  'linear-gradient(135deg,#EEF6EE,#E5F0E5)',
  'linear-gradient(135deg,#EEF3F8,#E4ECF3)',
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
  return COVER_GRADIENTS[hashString(domain) % COVER_GRADIENTS.length]
}

/** 字母兜底：域名首字符（优先英文首字母） */
export function domainLetter(domain: string): string {
  const stripped = domain.replace(/^[0-9.]+/, '')
  return (stripped[0] ?? '?').toUpperCase()
}
