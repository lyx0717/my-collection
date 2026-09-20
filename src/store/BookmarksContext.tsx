import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Bookmark, BookmarkInput, Collection, StoreShape } from '../types'
import { uid } from '../lib/id'
import { dedupeKey, extractDomain } from '../lib/url'
import { exportNetscape } from '../lib/netscape'

const STORAGE_KEY = 'mybookmarks:v2'
const LEGACY_SYNC_KEY = 'mybookmarks:sync-config'

const EMPTY_STORE: StoreShape = { version: 2, bookmarks: [], collections: [] }

/** 书签按 order 排序；无 order 的旧数据按当前数组位置补 order */
function withBookmarkOrder(data: StoreShape): StoreShape {
  const bmMissing = data.bookmarks.some((bm) => typeof bm.order !== 'number')
  const bookmarks = data.bookmarks
    .map((bm, i) => (typeof bm.order === 'number' ? bm : { ...bm, order: i }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const colMissing = data.collections.some((c) => typeof c.order !== 'number')
  const collections = data.collections
    .map((c, i) => (typeof c.order === 'number' ? c : { ...c, order: i }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return bmMissing || colMissing ? { ...data, bookmarks, collections } : data
}

/** 按 id 顺序重写 order（紧凑、稳定） */
function reorderByIds<T extends { id: string; order?: number }>(
  items: T[],
  orderedIds: string[],
): T[] {
  const rank = new Map(orderedIds.map((id, i) => [id, i]))
  return [...items]
    .map((it) => (rank.has(it.id) ? { ...it, order: rank.get(it.id)! } : it))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * 在「当前可见子集」内重排，并写回全局 order。
 * 筛选外条目保持相对位置：只把可见槽位按新顺序填入，再整体压成 0..n-1。
 */
function reorderVisibleInGlobal<T extends { id: string; order?: number }>(
  items: T[],
  orderedVisibleIds: string[],
): T[] {
  const byId = new Map(items.map((it) => [it.id, it]))
  const visibleSet = new Set(orderedVisibleIds)
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const slots: number[] = []
  sorted.forEach((it, i) => {
    if (visibleSet.has(it.id)) slots.push(i)
  })
  const next = [...sorted]
  orderedVisibleIds.forEach((id, i) => {
    const item = byId.get(id)
    if (item && i < slots.length) next[slots[i]] = item
  })
  return next.map((it, i) => ({ ...it, order: i }))
}

function isBookmark(v: unknown): v is Bookmark {
  if (typeof v !== 'object' || v === null) return false
  const b = v as Record<string, unknown>
  return (
    typeof b.id === 'string' &&
    typeof b.url === 'string' &&
    /^https?:\/\//i.test(b.url) &&
    typeof b.title === 'string' &&
    Array.isArray(b.tags) &&
    b.tags.every((t) => typeof t === 'string') &&
    typeof b.starred === 'boolean' &&
    typeof b.createdAt === 'string'
  )
}

function isStore(v: unknown): v is StoreShape {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    s.version === 2 &&
    Array.isArray(s.bookmarks) &&
    s.bookmarks.every(isBookmark) &&
    Array.isArray(s.collections)
  )
}

function loadLocal(): StoreShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isStore(parsed)) return parsed
    }
  } catch {
    // 损坏时回落内置数据
  }
  return null
}

function persistLocal(data: StoreShape) {
  const text = JSON.stringify(data)
  localStorage.setItem(STORAGE_KEY, text)
  return new Blob([text]).size
}

export interface NewBookmarkDraft {
  url: string
  title: string
  description?: string
  faviconUrl?: string
  cover?: string
  collectionId?: string
  tags: string[]
  createdAt?: string
}

interface BookmarksContextValue {
  bookmarks: Bookmark[]
  collections: Collection[]
  seedLoading: boolean
  addBookmark: (input: BookmarkInput) => Bookmark
  updateBookmark: (id: string, patch: Partial<BookmarkInput>) => void
  removeBookmark: (id: string) => void
  toggleStar: (id: string) => void
  bulkAdd: (drafts: NewBookmarkDraft[]) => number
  findDuplicate: (url: string, exceptId?: string) => Bookmark | undefined
  addCollection: (name: string, emoji?: string) => Collection
  renameCollection: (id: string, name: string, emoji?: string) => void
  removeCollection: (id: string) => void
  renameTag: (oldName: string, newName: string) => void
  removeTag: (name: string) => void
  mergeCollections: (incoming: Collection[]) => void
  bulkUpdate: (ids: string[], patch: Partial<BookmarkInput>) => void
  bulkAddTags: (ids: string[], tags: string[]) => void
  bulkRemove: (ids: string[]) => void
  reorderBookmarks: (orderedIds: string[]) => void
  reorderCollections: (orderedIds: string[]) => void
  replaceAll: (data: StoreShape) => void
  resetToSeed: () => Promise<void>
  clearAll: () => void
  downloadJson: () => void
  downloadNetscape: () => void
  storageBytes: number
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null)

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadLocal())
  const [store, setStore] = useState<StoreShape>(() =>
    initial.current ? withBookmarkOrder(initial.current) : EMPTY_STORE,
  )
  const [seedLoading, setSeedLoading] = useState(() => initial.current === null)
  const [storageBytes, setStorageBytes] = useState(0)
  const storeRef = useRef(store)
  storeRef.current = store

  // 清理已下线的云同步残留配置
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_SYNC_KEY)
    } catch {
      // ignore
    }
  }, [])

  // 首次使用 / 本地数据损坏时，懒加载内置书签
  useEffect(() => {
    if (!seedLoading) return
    let cancelled = false
    void import('../data/seed').then(({ SEED_DATA }) => {
      if (cancelled) return
      const seeded = withBookmarkOrder(structuredClone(SEED_DATA))
      setStore(seeded)
      setStorageBytes(persistLocal(seeded))
      setSeedLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [seedLoading])

  useEffect(() => {
    if (seedLoading) return
    setStorageBytes(persistLocal(store))
  }, [store, seedLoading])

  const commit = useCallback((updater: (s: StoreShape) => StoreShape) => {
    setStore((prev) => updater(prev))
  }, [])

  const addBookmark = useCallback(
    (input: BookmarkInput): Bookmark => {
      const now = new Date().toISOString()
      const bm: Bookmark = {
        id: uid(),
        starred: input.starred ?? false,
        ...input,
        domain: extractDomain(input.url),
        createdAt: now,
        updatedAt: now,
      }
      commit((s) => {
        const maxOrder = s.bookmarks.reduce((m, b) => Math.max(m, b.order ?? 0), -1)
        return { ...s, bookmarks: [...s.bookmarks, { ...bm, order: maxOrder + 1 }] }
      })
      return bm
    },
    [commit],
  )

  const updateBookmark = useCallback(
    (id: string, patch: Partial<BookmarkInput>) => {
      commit((s) => ({
        ...s,
        bookmarks: s.bookmarks.map((bm) =>
          bm.id === id
            ? {
                ...bm,
                ...patch,
                domain: patch.url ? extractDomain(patch.url) : bm.domain,
                updatedAt: new Date().toISOString(),
              }
            : bm,
        ),
      }))
    },
    [commit],
  )

  const removeBookmark = useCallback(
    (id: string) => {
      commit((s) => {
        const rest = s.bookmarks.filter((bm) => bm.id !== id)
        return { ...s, bookmarks: rest.map((bm, i) => ({ ...bm, order: i })) }
      })
    },
    [commit],
  )

  /** 拖拽后按新顺序持久化 */
  const reorderBookmarks = useCallback(
    (orderedIds: string[]) => {
      commit((s) => ({ ...s, bookmarks: reorderVisibleInGlobal(s.bookmarks, orderedIds) }))
    },
    [commit],
  )

  const reorderCollections = useCallback(
    (orderedIds: string[]) => {
      commit((s) => ({ ...s, collections: reorderByIds(s.collections, orderedIds) }))
    },
    [commit],
  )

  const toggleStar = useCallback(
    (id: string) => {
      commit((s) => ({
        ...s,
        bookmarks: s.bookmarks.map((bm) =>
          bm.id === id ? { ...bm, starred: !bm.starred } : bm,
        ),
      }))
    },
    [commit],
  )

  const findDuplicate = useCallback(
    (url: string, exceptId?: string) => {
      const key = dedupeKey(url)
      return store.bookmarks.find((bm) => bm.id !== exceptId && dedupeKey(bm.url) === key)
    },
    [store.bookmarks],
  )

  const bulkAdd = useCallback(
    (drafts: NewBookmarkDraft[]) => {
      const now = new Date().toISOString()
      const base =
        storeRef.current.bookmarks.reduce((m, b) => Math.max(m, b.order ?? 0), -1) + 1
      const newItems: Bookmark[] = drafts.map((d, i) => ({
        id: uid(),
        url: d.url,
        title: d.title,
        description: d.description,
        faviconUrl: d.faviconUrl,
        cover: d.cover,
        collectionId: d.collectionId,
        tags: d.tags,
        starred: false,
        domain: extractDomain(d.url),
        createdAt: d.createdAt ?? now,
        updatedAt: now,
        order: base + i,
      }))
      commit((s) => ({ ...s, bookmarks: [...s.bookmarks, ...newItems] }))
      return newItems.length
    },
    [commit],
  )

  const addCollection = useCallback(
    (name: string, emoji?: string) => {
      const created: Collection = {
        id: uid('col'),
        name,
        emoji,
        order: storeRef.current.collections.length,
      }
      commit((s) => ({ ...s, collections: [...s.collections, created] }))
      return created
    },
    [commit],
  )

  const renameCollection = useCallback(
    (id: string, name: string, emoji?: string) => {
      commit((s) => ({
        ...s,
        collections: s.collections.map((c) =>
          c.id === id ? { ...c, name, ...(emoji !== undefined ? { emoji } : {}) } : c,
        ),
      }))
    },
    [commit],
  )

  const removeCollection = useCallback(
    (id: string) => {
      commit((s) => ({
        ...s,
        version: 2,
        collections: s.collections.filter((c) => c.id !== id),
        bookmarks: s.bookmarks.map((bm) =>
          bm.collectionId === id ? { ...bm, collectionId: undefined } : bm,
        ),
      }))
    },
    [commit],
  )

  const renameTag = useCallback(
    (oldName: string, newNameRaw: string) => {
      const newName = newNameRaw.trim()
      if (!newName || newName === oldName) return
      commit((s) => ({
        ...s,
        bookmarks: s.bookmarks.map((bm) => {
          if (!bm.tags.includes(oldName)) return bm
          const tags = bm.tags.map((t) => (t === oldName ? newName : t))
          return { ...bm, tags: [...new Set(tags)] }
        }),
      }))
    },
    [commit],
  )

  const removeTag = useCallback(
    (name: string) => {
      commit((s) => ({
        ...s,
        bookmarks: s.bookmarks.map((bm) =>
          bm.tags.includes(name) ? { ...bm, tags: bm.tags.filter((t) => t !== name) } : bm,
        ),
      }))
    },
    [commit],
  )

  const mergeCollections = useCallback(
    (incoming: Collection[]) => {
      commit((s) => {
        const have = new Set(s.collections.map((c) => c.id))
        const merged = [...s.collections]
        incoming.forEach((c, i) => {
          if (!have.has(c.id)) {
            merged.push({ ...c, order: c.order ?? s.collections.length + i })
            have.add(c.id)
          }
        })
        return { ...s, collections: merged }
      })
    },
    [commit],
  )

  const bulkUpdate = useCallback(
    (ids: string[], patch: Partial<BookmarkInput>) => {
      const idSet = new Set(ids)
      commit((s) => ({
        ...s,
        bookmarks: s.bookmarks.map((bm) =>
          idSet.has(bm.id)
            ? {
                ...bm,
                ...patch,
                domain: patch.url ? extractDomain(patch.url) : bm.domain,
                updatedAt: new Date().toISOString(),
              }
            : bm,
        ),
      }))
    },
    [commit],
  )

  const bulkAddTags = useCallback(
    (ids: string[], newTags: string[]) => {
      if (!newTags.length) return
      const idSet = new Set(ids)
      commit((s) => ({
        ...s,
        bookmarks: s.bookmarks.map((bm) =>
          idSet.has(bm.id)
            ? { ...bm, tags: [...new Set([...bm.tags, ...newTags])] }
            : bm,
        ),
      }))
    },
    [commit],
  )

  const bulkRemove = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids)
      commit((s) => {
        const rest = s.bookmarks.filter((bm) => !idSet.has(bm.id))
        return { ...s, bookmarks: rest.map((bm, i) => ({ ...bm, order: i })) }
      })
    },
    [commit],
  )

  const replaceAll = useCallback((data: StoreShape) => commit(() => withBookmarkOrder(data)), [commit])

  const resetToSeed = useCallback(async () => {
    const { SEED_DATA } = await import('../data/seed')
    commit(() => withBookmarkOrder(structuredClone(SEED_DATA)))
  }, [commit])

  const clearAll = useCallback(
    () => commit(() => ({ version: 2, bookmarks: [], collections: [] })),
    [commit],
  )

  const downloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mybookmarks-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [store])

  const downloadNetscape = useCallback(() => {
    const blob = new Blob([exportNetscape(store.bookmarks, store.collections)], {
      type: 'text/html;charset=utf-8',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bookmarks-${new Date().toISOString().slice(0, 10)}.html`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [store])

  const value = useMemo<BookmarksContextValue>(
    () => ({
      bookmarks: store.bookmarks,
      collections: store.collections,
      seedLoading,
      addBookmark,
      updateBookmark,
      removeBookmark,
      toggleStar,
      bulkAdd,
      findDuplicate,
      addCollection,
      renameCollection,
      removeCollection,
      renameTag,
      removeTag,
      mergeCollections,
      bulkUpdate,
      bulkAddTags,
      bulkRemove,
      reorderBookmarks,
      reorderCollections,
      replaceAll,
      resetToSeed,
      clearAll,
      downloadJson,
      downloadNetscape,
      storageBytes,
    }),
    [
      store,
      seedLoading,
      addBookmark,
      updateBookmark,
      removeBookmark,
      toggleStar,
      bulkAdd,
      findDuplicate,
      addCollection,
      renameCollection,
      removeCollection,
      renameTag,
      removeTag,
      mergeCollections,
      bulkUpdate,
      bulkAddTags,
      bulkRemove,
      reorderBookmarks,
      reorderCollections,
      replaceAll,
      resetToSeed,
      clearAll,
      downloadJson,
      downloadNetscape,
      storageBytes,
    ],
  )

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>
}

export function useBookmarks(): BookmarksContextValue {
  const ctx = useContext(BookmarksContext)
  if (!ctx) throw new Error('useBookmarks 必须在 BookmarksProvider 内使用')
  return ctx
}
