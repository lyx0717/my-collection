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
  const [store, setStore] = useState<StoreShape>(() => initial.current ?? EMPTY_STORE)
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
      const seeded = structuredClone(SEED_DATA)
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
      commit((s) => ({ ...s, bookmarks: [...s.bookmarks, bm] }))
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
      commit((s) => ({ ...s, bookmarks: s.bookmarks.filter((bm) => bm.id !== id) }))
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
      const newItems: Bookmark[] = drafts.map((d) => ({
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
      commit((s) => ({ ...s, bookmarks: s.bookmarks.filter((bm) => !idSet.has(bm.id)) }))
    },
    [commit],
  )

  const replaceAll = useCallback((data: StoreShape) => commit(() => data), [commit])

  const resetToSeed = useCallback(async () => {
    const { SEED_DATA } = await import('../data/seed')
    commit(() => structuredClone(SEED_DATA))
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
