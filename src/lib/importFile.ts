import Papa from 'papaparse'
import type { Collection, ParsedImportBookmark } from '../types'
import { parseNetscape } from './netscape'
import { parseTags } from './tags'

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

function parseJson(text: string): Omit<ParsedImport, 'format'> {
  const data = JSON.parse(text) as unknown
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
