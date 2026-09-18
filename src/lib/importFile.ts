import Papa from 'papaparse'
import type { Collection, ParsedImportBookmark } from '../types'
import { parseNetscape } from './netscape'
import { parseTags } from './tags'
import { extractDomain } from './url'

export interface ParsedImport {
  bookmarks: ParsedImportBookmark[]
  collectionNames: string[]
  /** 若导入文件自带分组定义（本站 JSON），一并返回 */
  collections?: Collection[]
  format: string
}

/** 兼容本站 JSON、Linkding JSON 等：取常见字段名 */
function normalizeEntry(raw: Record<string, unknown>): ParsedImportBookmark | null {
  const url = typeof raw.url === 'string' ? raw.url : ''
  if (!/^https?:\/\//i.test(url)) return null
  const title =
    (typeof raw.title === 'string' && raw.title) ||
    (typeof raw.website_title === 'string' && raw.website_title) ||
    url
  const description =
    (typeof raw.description === 'string' && raw.description) ||
    (typeof raw.excerpt === 'string' && raw.excerpt) ||
    (typeof raw.note === 'string' && raw.note) ||
    undefined
  const rawTags = raw.tags
  let tags: string[] = []
  if (Array.isArray(rawTags)) tags = rawTags.filter((t): t is string => typeof t === 'string')
  else if (typeof rawTags === 'string') tags = parseTags(rawTags)
  const collectionName =
    (typeof raw.folder === 'string' && raw.folder) ||
    (typeof raw.collectionName === 'string' && raw.collectionName) ||
    undefined
  const createdAtRaw = raw.createdAt ?? raw.created ?? raw.date_added
  const createdAt =
    typeof createdAtRaw === 'string' && !Number.isNaN(Date.parse(createdAtRaw))
      ? new Date(createdAtRaw).toISOString()
      : undefined
  return { url, title, description: description || undefined, tags, collectionName, createdAt }
}

interface ITabItem {
  url?: string
  name?: string
  iconText?: string
  type?: string
  children?: ITabItem[]
}
interface ITabNav {
  name?: string
  children?: ITabItem[]
}

/** 解析 iTab 新标签页扩展导出的 .itabdata（JSON：navConfig 导航页 + children 图标） */
function parseITab(data: { navConfig?: ITabNav[] }): Omit<ParsedImport, 'format'> {
  const navs = Array.isArray(data.navConfig) ? data.navConfig : []
  const bookmarks: ParsedImportBookmark[] = []
  const collectionNames: string[] = []

  const titleOf = (item: ITabItem): string => {
    const name = item.name?.trim()
    if (name) return name
    const iconText = item.iconText?.trim() ?? ''
    if (iconText) {
      // text 型磁贴的 iconText 就是名称；icon 型的中文缩写可识别，
      // 纯拉丁缩写（如 Wei）多为自动生成，改用域名更清楚
      if (item.type !== 'icon' || /[\u4e00-\u9fa5]/.test(iconText)) return iconText
    }
    return extractDomain(item.url ?? '')
  }

  const walk = (items: ITabItem[], collectionName: string) => {
    for (const item of items) {
      // 文件夹本身可能也带链接，先收录再拍平其子项
      if (Array.isArray(item.children)) {
        if (item.url && /^https?:\/\//i.test(item.url)) {
          bookmarks.push({ url: item.url, title: titleOf(item), tags: [], collectionName })
        }
        walk(item.children, collectionName)
        continue
      }
      if (item.url && /^https?:\/\//i.test(item.url)) {
        bookmarks.push({ url: item.url, title: titleOf(item), tags: [], collectionName })
      }
    }
  }

  navs.forEach((nav, i) => {
    const name = nav.name?.trim() || `其他导航`
    collectionNames.push(name)
    walk(nav.children ?? [], name || `分组 ${i + 1}`)
  })

  return { bookmarks, collectionNames }
}

function parseJson(text: string): Omit<ParsedImport, 'format'> {
  const data = JSON.parse(text) as unknown
  // iTab 导出：{ navConfig: [...], notes: [...] }
  if (data && typeof data === 'object' && Array.isArray((data as { navConfig?: unknown }).navConfig)) {
    return parseITab(data as { navConfig: ITabNav[] })
  }
  // 本站完整备份
  if (data && typeof data === 'object' && Array.isArray((data as { bookmarks?: unknown }).bookmarks)) {
    const shape = data as { bookmarks: unknown[]; collections?: Collection[] }
    return {
      bookmarks: shape.bookmarks
        .map((b) => normalizeEntry(b as Record<string, unknown>))
        .filter((b): b is ParsedImportBookmark => b !== null),
      collectionNames: (shape.collections ?? []).map((c) => c.name),
      collections: shape.collections,
    }
  }
  if (Array.isArray(data)) {
    return {
      bookmarks: data
        .map((b) => normalizeEntry(b as Record<string, unknown>))
        .filter((b): b is ParsedImportBookmark => b !== null),
      collectionNames: [],
    }
  }
  throw new Error('JSON 里没有找到书签数组')
}

function parseCsv(text: string): Omit<ParsedImport, 'format'> {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })
  const bookmarks = result.data
    .map((row) =>
      normalizeEntry({
        url: row.url ?? row.link ?? '',
        title: row.title ?? row.name ?? '',
        description: row.excerpt ?? row.note ?? row.description ?? '',
        tags: row.tags ?? '',
        folder: row.folder ?? row.collection ?? '',
        createdAt: row.created ?? row['created at'] ?? '',
      }),
    )
    .filter((b): b is ParsedImportBookmark => b !== null)
  return {
    bookmarks,
    collectionNames: [...new Set(bookmarks.map((b) => b.collectionName).filter(Boolean))] as string[],
  }
}

export async function parseImportFile(file: File): Promise<ParsedImport> {
  const text = await file.text()
  const name = file.name.toLowerCase()
  if (name.endsWith('.itabdata')) {
    return { ...parseJson(text), format: 'iTab 备份' }
  }
  if (name.endsWith('.html') || name.endsWith('.htm') || text.trimStart().startsWith('<!')) {
    return { ...parseNetscape(text), format: 'Netscape HTML' }
  }
  if (name.endsWith('.csv')) {
    return { ...parseCsv(text), format: 'CSV' }
  }
  // 默认按 JSON 解析，失败则尝试 CSV（部分浏览器导出文件名无扩展名）
  try {
    return { ...parseJson(text), format: 'JSON' }
  } catch (jsonErr) {
    try {
      return { ...parseCsv(text), format: 'CSV' }
    } catch {
      throw new Error(
        jsonErr instanceof Error ? jsonErr.message : '无法识别文件格式，请选择浏览器导出的 HTML/JSON/CSV',
      )
    }
  }
}
