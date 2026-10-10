export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'mybookmarks:theme'

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

/**
 * 设置/移除 html[data-theme]，与 index.html 防白闪脚本同一套规则。
 * 同时挂上 data-glass="on" —— 界面风格切换已下线，玻璃是唯一材质，
 * 属性恒为 on，所有玻璃样式不再需要 `html[data-glass='on']` 前缀以外的条件。
 */
export function applyTheme(mode: ThemeMode) {
  if (resolvedTheme(mode) === 'dark') document.documentElement.dataset.theme = 'dark'
  else delete document.documentElement.dataset.theme
  document.documentElement.dataset.glass = 'on'
}
