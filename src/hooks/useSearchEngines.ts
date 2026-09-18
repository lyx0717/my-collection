import { useCallback, useState } from 'react'
import {
  BUILTIN_ENGINES,
  engineId,
  loadActiveEngineId,
  loadEngines,
  saveActiveEngineId,
  saveCustomEngines,
  type SearchEngine,
} from '../lib/engines'

export function useSearchEngines() {
  const [engines, setEngines] = useState<SearchEngine[]>(loadEngines)
  const [activeId, setActiveId] = useState<string>(loadActiveEngineId)

  const active = engines.find((e) => e.id === activeId) ?? BUILTIN_ENGINES[0]

  const select = useCallback((id: string) => {
    setActiveId(id)
    saveActiveEngineId(id)
  }, [])

  const addEngine = useCallback((name: string, url: string): SearchEngine | null => {
    const trimmedName = name.trim()
    const trimmedUrl = url.trim()
    if (!trimmedName || !trimmedUrl.includes('%s')) return null
    const engine: SearchEngine = { id: engineId(), name: trimmedName, url: trimmedUrl }
    const next = [...engines, engine]
    setEngines(next)
    saveCustomEngines(next)
    select(engine.id)
    return engine
  }, [engines, select])

  const removeEngine = useCallback((id: string) => {
    const target = engines.find((e) => e.id === id)
    if (target?.builtin) return
    const next = engines.filter((e) => e.id !== id)
    setEngines(next)
    saveCustomEngines(next)
    if (activeId === id) select('baidu')
  }, [engines, activeId, select])

  return { engines, active, select, addEngine, removeEngine }
}
