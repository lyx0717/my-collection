import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyGlassMode, loadGlassMode, saveGlassMode, type GlassMode } from '../lib/appearance'

interface AppearanceContextValue {
  glassMode: GlassMode
  setGlassMode: (mode: GlassMode) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [glassMode, setGlassModeState] = useState<GlassMode>(() => loadGlassMode())

  useEffect(() => {
    applyGlassMode(glassMode)
  }, [glassMode])

  const setGlassMode = useCallback((mode: GlassMode) => {
    setGlassModeState(mode)
    saveGlassMode(mode)
    applyGlassMode(mode)
  }, [])

  const value = useMemo(() => ({ glassMode, setGlassMode }), [glassMode, setGlassMode])

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance 必须在 AppearanceProvider 内使用')
  return ctx
}
