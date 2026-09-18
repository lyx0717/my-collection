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
import { SEED_DATA } from '../data/seed'
import { uid } from '../lib/id'
import { dedupeKey, extractDomain } from '../lib/url'
import { exportNetscape } from '../lib/netscape'

const STORAGE_KEY = 'mybookmarks:v2'

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
    typeof b.createdAt === 'string' &&
    !Number.isNaN(Date.parse(b.createdAt as string))
  )
}

function isStore(v: unknown): v is StoreShape {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    s.version === 2 &&
    Array.isArray(s.bookmarks) &&
    s.bookmarks.every(isBookmark) &&
    Array.isArray(s.collections) &&
    s.collections.every(
      (c) => typeof c === 'object' && c !== null && typeof (c as Collection).id === 'string',
    )
  )
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isStore(parsed)) return parsed
    }
  } catch {
    // 数据损坏回落示例
  }
  return structuredClone(SEED_DATA)
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
  replaceAll: (data: StoreShape) => void
  resetToSeed: () => void
  clearAll: () => void
  downloadJson: () => void
  downloadNetscape: () => void
  storageBytes: number
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null)

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreShape>(load)
  const hydrated = useRef(false)
  const [storageBytes, setStorageBytes] = useState(0)

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      setStorageBytes(new Blob([localStorage.getItem(STORAGE_KEY) ?? '']).size)
      return
    }
    const text = JSON.stringify(store)
    localStorage.setItem(STORAGE_KEY, text)
    setStorageBytes(new Blob([text]).size)
  }, [store])

  const addBookmark = useCallback((input: BookmarkInput): Bookmark => {
    const now = new Date().toISOString()
    const bm: Bookmark = {
      id: uid(),
      starred: input.starred ?? false,
      ...input,
      domain: extractDomain(input.url),
      createdAt: now,
      updatedAt: now,
    }
    setStore((s) => ({ ...s, bookmarks: [...s.bookmarks, bm] }))
    return bm
  }, [])

  const updateBookmark = useCallback((id: string, patch: Partial<BookmarkInput>) => {
    setStore((s) => ({
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
  }, [])

  const removeBookmark = useCallback((id: string) => {
    setStore((s) => ({ ...s, bookmarks: s.bookmarks.filter((bm) => bm.id !== id) }))
  }, [])

  const toggleStar = useCallback((id: string) => {
    setStore((s) => ({
      ...s,
      bookmarks: s.bookmarks.map((bm) =>
        bm.id === id ? { ...bm, starred: !bm.starred } : bm,
      ),
    }))
  }, [])

  const findDuplicate = useCallback(
    (url: string, exceptId?: string) => {
      const key = dedupeKey(url)
      return store.bookmarks.find(
        (bm) => bm.id !== exceptId && dedupeKey(bm.url) === key,
      )
    },
    [store.bookmarks],
  )

  const bulkAdd = useCallback((drafts: NewBookmarkDraft[]) => {
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
    setStore((s) => ({ ...s, bookmarks: [...s.bookmarks, ...newItems] }))
    return newItems.length
  }, [])

  const addCollection = useCallback(
    (name: string, emoji?: string) => {
      const created: Collection = {
        id: uid('col'),
        name,
        emoji,
        order: store.collections.length,
      }
      setStore((s) => ({ ...s, collections: [...s.collections, created] }))
      return created
    },
    [store.collections.length],
  )

  const renameCollection = useCallback((id: string, name: string, emoji?: string) => {
    setStore((s) => ({
      ...s,
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, name, ...(emoji !== undefined ? { emoji } : {}) } : c,
      ),
    }))
  }, [])

  const removeCollection = useCallback((id: string) => {
    setStore((s) => ({
      ...s,
      version: 2,
      collections: s.collections.filter((c) => c.id !== id),
      bookmarks: s.bookmarks.map((bm) =>
        bm.collectionId === id ? { ...bm, collectionId: undefined } : bm,
      ),
    }))
  }, [])

  const renameTag = useCallback((oldName: string, newNameRaw: string) => {
    const newName = newNameRaw.trim()
    if (!newName || newName === oldName) return
    setStore((s) => ({
      ...s,
      bookmarks: s.bookmarks.map((bm) => {
        if (!bm.tags.includes(oldName)) return bm
        // 目标标签已存在则合并（去重）
        const tags = bm.tags.map((t) => (t === oldName ? newName : t))
        return { ...bm, tags: [...new Set(tags)] }
      }),
    }))
  }, [])

  const removeTag = useCallback((name: string) => {
    setStore((s) => ({
      ...s,
      bookmarks: s.bookmarks.map((bm) =>
        bm.tags.includes(name) ? { ...bm, tags: bm.tags.filter((t) => t !== name) } : bm,
      ),
    }))
  }, [])

  const replaceAll = useCallback((data: StoreShape) => setStore(data), [])
  const resetToSeed = useCallback(() => setStore(structuredClone(SEED_DATA)), [])
  const clearAll = useCallback(
    () => setStore({ version: 2, bookmarks: [], collections: [] }),
    [],
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
      replaceAll,
      resetToSeed,
      clearAll,
      downloadJson,
      downloadNetscape,
      storageBytes,
    }),
    [
      store,
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
