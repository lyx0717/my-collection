export type GlassMode = 'solid' | 'glass'

const GLASS_KEY = 'mybookmarks:glass'

export function loadGlassMode(): GlassMode {
  try {
    return localStorage.getItem(GLASS_KEY) === 'glass' ? 'glass' : 'solid'
  } catch {
    return 'solid'
  }
}

export function saveGlassMode(mode: GlassMode) {
  try {
    localStorage.setItem(GLASS_KEY, mode)
  } catch {
    // ignore
  }
}

export function applyGlassMode(mode: GlassMode) {
  if (mode === 'glass') document.documentElement.dataset.glass = 'on'
  else delete document.documentElement.dataset.glass
}
