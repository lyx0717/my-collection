import { useCallback, useState } from 'react'
import {
  BUILTIN_ENGINES,
  engineId,
  loadActiveEngineId,
  loadEngines,
  parseEngineUrl,
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

  /**
   * 添加自定义引擎。url 既可以是搜索后的完整网址（自动识别关键词），
   * 也可以是含 %s 的模板；name 留空时按域名自动取名。
   */
  const addEngine = useCallback((name: string, url: string): SearchEngine | null => {
    const parsed = parseEngineUrl(url)
    if (!parsed.ok) return null
    const engine: SearchEngine = {
      id: engineId(),
      name: name.trim() || parsed.template.name || '自定义',
      url: parsed.template.url,
    }
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
    if (activeId === id) select('bing')
  }, [engines, activeId, select])

  return { engines, active, select, addEngine, removeEngine }
}
