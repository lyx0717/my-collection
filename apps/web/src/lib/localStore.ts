import type { Bookmark, Collection, StoreShape } from '../types'
import { CURRENT_VERSION, migrateV2ToV4, migrateV3ToV4, type LegacyBookmark } from './migrate'

/**
 * 旧版本的数据存在本机 localStorage 里（新架构改成了服务端）。
 * 这里只负责「读出来」和「确认迁走之后清掉」，不再有任何写入路径。
 */

const STORAGE_KEY = 'mybookmarks:v4'
const LEGACY_KEYS: Array<{ key: string; version: 3 | 2 }> = [
  { key: 'mybookmarks:v3', version: 3 },
  { key: 'mybookmarks:v2', version: 2 },
]

function isBookmark(value: unknown): value is Bookmark {
  if (typeof value !== 'object' || value === null) return false
  const b = value as Record<string, unknown>
  return (
    typeof b.id === 'string' &&
    typeof b.url === 'string' &&
    /^https?:\/\//i.test(b.url) &&
    typeof b.title === 'string' &&
    typeof b.createdAt === 'string'
  )
}

function isStore(value: unknown): value is StoreShape {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    s.version === CURRENT_VERSION &&
    Array.isArray(s.bookmarks) &&
    s.bookmarks.every(isBookmark) &&
    Array.isArray(s.collections)
  )
}

/**
 * 读取本机旧档：有 v4 直接用，否则依次尝试 v3 / v2 迁移。
 * 迁移的判定标准是「书签条数不减少」—— 宁可让个别书签落入未分组，
 * 也不能因为规则没覆盖到而丢书签。
 */
export function readLocalStore(): StoreShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isStore(parsed)) return parsed
    }
  } catch {
    // 数据损坏，当作没有
  }

  for (const { key, version } of LEGACY_KEYS) {
    const migrated = migrateLegacy(key, version)
    if (migrated) return migrated
  }
  return null
}

function migrateLegacy(key: string, version: 3 | 2): StoreShape | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const legacy: unknown = JSON.parse(raw)
    if (typeof legacy !== 'object' || legacy === null) return null
    const old = legacy as { version?: unknown; bookmarks?: unknown; collections?: unknown }
    if (old.version !== version || !Array.isArray(old.bookmarks) || !Array.isArray(old.collections))
      return null

    const before = old.bookmarks.length
    const migrated =
      version === 3
        ? migrateV3ToV4({
            version: 3,
            bookmarks: old.bookmarks as Bookmark[],
            collections: old.collections as Collection[],
          })
        : migrateV2ToV4({
            version: 2,
            bookmarks: old.bookmarks as LegacyBookmark[],
            collections: old.collections as Collection[],
          })
    // 条数对不上说明迁移丢了数据，宁可不动旧档
    return migrated.bookmarks.length === before ? migrated : null
  } catch {
    return null
  }
}

/** 只有服务端确认写入成功后才会调用 */
export function clearLocalStore(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    for (const { key } of LEGACY_KEYS) localStorage.removeItem(key)
  } catch {
    // 忽略
  }
}
