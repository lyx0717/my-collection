import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, loadTheme, saveTheme, type ThemeMode } from '../lib/appearance'

interface AppearanceContextValue {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => loadTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // system 模式下跟随系统即时切换
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    saveTheme(mode)
    applyTheme(mode)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance 必须在 AppearanceProvider 内使用')
  return ctx
}
