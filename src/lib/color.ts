/** 域名 → 稳定的冷调柔和底色/深色文字对（favicon 兜底） */
const LETTER_PALETTES: Array<{ bg: string; fg: string }> = [
  { bg: '#eef1f5', fg: '#3a4150' },
  { bg: '#e7f0ff', fg: '#0057a4' },
  { bg: '#e8f0ff', fg: '#4263eb' },
  { bg: '#e3f7f1', fg: '#0c9d8c' },
  { bg: '#fce8f1', fg: '#cf3d7a' },
  { bg: '#eef2ff', fg: '#4a5fd8' },
  { bg: '#e2f3fb', fg: '#0285b6' },
  { bg: '#ffede6', fg: '#e8741e' },
  { bg: '#efecfc', fg: '#6b4fe0' },
  { bg: '#eef9ec', fg: '#5ba829' },
  { bg: '#fdecea', fg: '#c0392b' },
  { bg: '#e9f0f6', fg: '#4a6fa5' },
]

/** 网格封面：冷调极浅渐变，不抢 logo */
const COVER_GRADIENTS = [
  'linear-gradient(135deg,#eef2f8,#e3e9f3)',
  'linear-gradient(135deg,#f4eff5,#e9e6ef)',
  'linear-gradient(135deg,#ecf3f9,#e2edf5)',
  'linear-gradient(135deg,#ecf5f2,#e2efe9)',
  'linear-gradient(135deg,#eef0f6,#e4e9f2)',
  'linear-gradient(135deg,#eff0f9,#e8e9f3)',
  'linear-gradient(135deg,#edf4ee,#e4ece4)',
  'linear-gradient(135deg,#ecf2f8,#e3ecf4)',
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
