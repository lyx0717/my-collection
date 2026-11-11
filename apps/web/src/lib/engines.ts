import { extractDomain } from './url'

export interface SearchEngine {
  id: string
  name: string
  /** 查询模板，%s 为关键词占位符 */
  url: string
  builtin?: boolean
}

/** 从查询模板提取域名，用于搜索引擎图标 */
export function engineDomain(engine: Pick<SearchEngine, 'url'>): string {
  return extractDomain(engine.url.replace(/%s/g, 'x'))
}

/**
 * 常见站点的关键词参数名，按优先级排列。
 *
 * 用户从浏览器地址栏复制的搜索页链接里，关键词通常落在这些参数上；
 * 只要认出一个，就能把它的值换成 %s，用户不必再手写模板。
 */
const KEYWORD_PARAMS = [
  'q',
  'wd',
  'word',
  'keyword',
  'keywords',
  'query',
  'text',
  'term',
  'search',
  'search_query',
  'searchword',
  'searchterm',
  'searchkey',
  'search_text',
  'k',
  's',
  'qw',
  '_nkw',
]

/** 写进 URL 再换回 %s 的哨兵：URLSearchParams 会把 % 编码成 %25，不能直接塞占位符 */
const KEYWORD_SENTINEL = '__MYBOOKMARKS_KEYWORD__'

/** 常见站点名，用于「只粘网址也能得到像样的引擎名」 */
const SITE_NAMES: Record<string, string> = {
  'zhihu.com': '知乎',
  'github.com': 'GitHub',
  'bilibili.com': '哔哩哔哩',
  'douban.com': '豆瓣',
  'weibo.com': '微博',
  'xiaohongshu.com': '小红书',
  'youtube.com': 'YouTube',
  'x.com': 'X',
  'twitter.com': 'X',
  'reddit.com': 'Reddit',
  'stackoverflow.com': 'Stack Overflow',
  'npmjs.com': 'npm',
  'developer.mozilla.org': 'MDN',
  'wikipedia.org': 'Wikipedia',
  'baidu.com': '百度',
  'bing.com': '必应',
  'google.com': 'Google',
  'duckduckgo.com': 'DuckDuckGo',
  'yandex.com': 'Yandex',
  'taobao.com': '淘宝',
  'jd.com': '京东',
  'pixiv.net': 'Pixiv',
  'unsplash.com': 'Unsplash',
  'medium.com': 'Medium',
  'tumblr.com': 'Tumblr',
  'dribbble.com': 'Dribbble',
  'behance.net': 'Behance',
  'pinterest.com': 'Pinterest',
  'amazon.com': 'Amazon',
  'notion.so': 'Notion',
  'figma.com': 'Figma',
  'juejin.cn': '掘金',
  'csdn.net': 'CSDN',
  'sspai.com': '少数派',
  'v2ex.com': 'V2EX',
  'ycombinator.com': 'Hacker News',
  'huggingface.co': 'Hugging Face',
  'arxiv.org': 'arXiv',
}

export interface EngineTemplate {
  /** 查询模板，含 %s */
  url: string
  /** 自动识别出的关键词参数名；手写 %s 模板时为 null */
  param: string | null
  /** 按域名猜的引擎名 */
  name: string
}

export type EngineParseResult =
  | { ok: true; template: EngineTemplate }
  | { ok: false; error: string }

/** 按域名猜一个引擎名：先查常见站点，再用主域名兜底 */
export function guessEngineName(url: string): string {
  const domain = extractDomain(url)
  if (!domain) return ''

  if (SITE_NAMES[domain]) return SITE_NAMES[domain]

  let suffix = ''
  let matched = ''
  for (const [suffixKey, name] of Object.entries(SITE_NAMES)) {
    if (domain.endsWith(`.${suffixKey}`) && suffixKey.length > suffix.length) {
      suffix = suffixKey
      matched = name
    }
  }
  if (matched) return matched

  const labels = domain.split('.')
  let index = labels.length - 2
  if (index < 0) return domain
  // example.co.uk / example.com.cn 这类，主域名在倒数第三段
  if (['co', 'com', 'net', 'org', 'gov', 'edu', 'ac'].includes(labels[index])) index -= 1
  const raw = labels[Math.max(index, 0)] || labels[0]
  if (!raw || /^\d+$/.test(raw)) return domain
  return raw
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isUsableTemplate(template: string): boolean {
  return /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(template) && extractDomain(template) !== ''
}

/** 在查询参数里挑一个最像关键词的参数；优先有值的，其次按优先级取空参数 */
function pickKeywordParam(params: URLSearchParams): string | null {
  const actualKeys = new Map<string, string>()
  for (const key of params.keys()) {
    const lower = key.toLowerCase()
    if (!actualKeys.has(lower)) actualKeys.set(lower, key)
  }

  let emptyFallback: string | null = null
  for (const preferred of KEYWORD_PARAMS) {
    const key = actualKeys.get(preferred)
    if (!key) continue
    if (params.get(key)?.trim()) return key
    emptyFallback ??= key
  }
  return emptyFallback
}

function buildTemplateFromQuery(url: URL, key: string): string {
  const params = new URLSearchParams(url.search)
  params.set(key, KEYWORD_SENTINEL)
  const next = new URL(url.toString())
  next.search = params.toString()
  return next.toString().replace(KEYWORD_SENTINEL, '%s')
}

/** 有些站点把搜索放在 hash 路由里，如 https://example.com/#/search?q=react */
function buildTemplateFromHash(url: URL): { template: string; param: string } | null {
  const rawHash = url.hash.slice(1)
  const queryIndex = rawHash.indexOf('?')
  if (queryIndex === -1) return null

  const hashPath = rawHash.slice(0, queryIndex)
  const params = new URLSearchParams(rawHash.slice(queryIndex + 1))
  const key = pickKeywordParam(params)
  if (!key) return null

  params.set(key, KEYWORD_SENTINEL)
  const next = new URL(url.toString())
  next.hash = `${hashPath}?${params.toString()}`
  return { template: next.toString().replace(KEYWORD_SENTINEL, '%s'), param: key }
}

/** 少数站点把关键词放在路径里，如 /search/react、/s/photos/react */
function buildTemplateFromPath(url: URL): string | null {
  if (!/\/(?:search|s\/photos)\/[^/]+\/?$/i.test(url.pathname)) return null
  const next = new URL(url.toString())
  next.pathname = url.pathname.replace(/([^/]+)\/?$/, KEYWORD_SENTINEL)
  return next.toString().replace(KEYWORD_SENTINEL, '%s')
}

/**
 * 把用户输入变成查询模板。
 *
 * 支持三种输入：
 * 1. 含 %s 的模板（旧用法，继续兼容）；
 * 2. 搜索后的完整网址：自动找出关键词参数并替换成 %s；
 * 3. 不带协议头的域名/网址：自动补 https://。
 */
export function parseEngineUrl(raw: string): EngineParseResult {
  const input = raw.trim()
  if (!input) return { ok: false, error: '请粘贴搜索后的网址' }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input) && !/^https?:\/\//i.test(input)) {
    return { ok: false, error: '只支持 http(s) 链接' }
  }

  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`

  // 旧用法：用户已经写好了含 %s 的模板，原样保留
  if (/%s/i.test(withScheme)) {
    const template = withScheme.replace(/%S/g, '%s')
    if (!isUsableTemplate(template)) {
      return { ok: false, error: '链接格式不对，需以 http(s):// 开头且包含域名' }
    }
    return {
      ok: true,
      template: { url: template, param: null, name: guessEngineName(template) },
    }
  }

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return { ok: false, error: '链接格式不对，粘贴浏览器地址栏里的完整网址即可' }
  }
  if (!url.hostname.includes('.')) {
    return { ok: false, error: '链接格式不对，需包含完整域名' }
  }

  const queryKey = pickKeywordParam(url.searchParams)
  let template: string | null = null
  let param: string | null = null

  if (queryKey) {
    template = buildTemplateFromQuery(url, queryKey)
    param = queryKey
  } else {
    const hashTemplate = buildTemplateFromHash(url)
    if (hashTemplate) {
      template = hashTemplate.template
      param = hashTemplate.param
    }
  }
  if (!template) template = buildTemplateFromPath(url)

  if (!template) {
    return {
      ok: false,
      error: '没认出关键词位置：把搜索后的结果页网址粘进来，或在链接里用 %s 标出关键词',
    }
  }

  return {
    ok: true,
    template: { url: template, param, name: guessEngineName(template) },
  }
}

export const BUILTIN_ENGINES: SearchEngine[] = [
  { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q=%s', builtin: true },
  { id: 'Yandex', name: 'Yandex', url: 'https://yandex.com/search?text=%s', builtin: true },
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=%s', builtin: true },
  { id: 'yuanbao', name: '元宝', url: 'https://so.qq.com/isearch?query=%s', builtin: true },
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
  return localStorage.getItem(ACTIVE_KEY) || 'bing'
}

export function saveActiveEngineId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function engineId(): string {
  return `eng_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
