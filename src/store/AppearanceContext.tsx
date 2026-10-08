import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyGlassMode,
  applyTheme,
  loadGlassMode,
  loadTheme,
  saveGlassMode,
  saveTheme,
  type GlassMode,
  type ThemeMode,
} from '../lib/appearance'

interface AppearanceContextValue {
  glassMode: GlassMode
  setGlassMode: (mode: GlassMode) => void
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [glassMode, setGlassModeState] = useState<GlassMode>(() => loadGlassMode())
  const [theme, setThemeState] = useState<ThemeMode>(() => loadTheme())

  useEffect(() => {
    applyGlassMode(glassMode)
  }, [glassMode])

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

  const setGlassMode = useCallback((mode: GlassMode) => {
    setGlassModeState(mode)
    saveGlassMode(mode)
    applyGlassMode(mode)
  }, [])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    saveTheme(mode)
    applyTheme(mode)
  }, [])

  const value = useMemo(
    () => ({ glassMode, setGlassMode, theme, setTheme }),
    [glassMode, setGlassMode, theme, setTheme],
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance 必须在 AppearanceProvider 内使用')
  return ctx
}
