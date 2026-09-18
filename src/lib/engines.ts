export interface SearchEngine {
  id: string
  name: string
  /** 查询模板，%s 为关键词占位符 */
  url: string
  builtin?: boolean
}

export const BUILTIN_ENGINES: SearchEngine[] = [
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=%s', builtin: true },
  { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q=%s', builtin: true },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', builtin: true },
]

const ENGINES_KEY = 'mybookmarks:engines:v1'
const ACTIVE_KEY = 'mybookmarks:engine'

export function loadEngines(): SearchEngine[] {
  try {
    const raw = localStorage.getItem(ENGINES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as SearchEngine[]
      if (Array.isArray(parsed)) {
        return [...BUILTIN_ENGINES, ...parsed.filter((e) => e.id && e.name && e.url.includes('%s'))]
      }
    }
  } catch {
    // ignore
  }
  return BUILTIN_ENGINES
}

export function saveCustomEngines(engines: SearchEngine[]) {
  const custom = engines.filter((e) => !e.builtin)
  localStorage.setItem(ENGINES_KEY, JSON.stringify(custom))
}

export function loadActiveEngineId(): string {
  return localStorage.getItem(ACTIVE_KEY) || 'baidu'
}

export function saveActiveEngineId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function engineId(): string {
  return `eng_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
