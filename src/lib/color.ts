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

/** 网格封面渐变：低饱和柔和色，避免与玻璃/极简风抢视觉 */
const GRADIENTS = [
  'linear-gradient(135deg,#5B6470,#8A929C)',
  'linear-gradient(135deg,#D4899F,#C46B88)',
  'linear-gradient(135deg,#7EB8D8,#5A9BB8)',
  'linear-gradient(135deg,#6BB5A8,#4A9488)',
  'linear-gradient(135deg,#D4A574,#C4894A)',
  'linear-gradient(135deg,#8B92C4,#6B72A8)',
  'linear-gradient(135deg,#7BC492,#5AA874)',
  'linear-gradient(135deg,#6A9BC0,#4A7BA0)',
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
