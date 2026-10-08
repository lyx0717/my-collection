export type GlassMode = 'solid' | 'glass'
export type ThemeMode = 'light' | 'dark' | 'system'

const GLASS_KEY = 'mybookmarks:glass'
const THEME_KEY = 'mybookmarks:theme'

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

/** 系统当前是否深色 */
export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

/** 三态 → 实际生效的主题 */
export function resolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

export function loadTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function saveTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    // ignore
  }
}

/** 设置/移除 html[data-theme]，与 index.html 防白闪脚本同一套规则 */
export function applyTheme(mode: ThemeMode) {
  if (resolvedTheme(mode) === 'dark') document.documentElement.dataset.theme = 'dark'
  else delete document.documentElement.dataset.theme
}
