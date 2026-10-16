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
import type { Bookmark, BookmarkDraft, BookmarkInput, Collection } from '../types'
import { dedupeKey, extractDomain } from '../lib/url'
import { exportNetscape } from '../lib/netscape'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

interface LibraryResponse {
  bookmarks: Bookmark[]
  collections: Collection[]
}

export interface BulkAddResult {
  created: number
  skipped: number
}

/** 按 id 顺序重写 order（分组只有一层，不需要可见子集那套） */
function reorderByIds<T extends { id: string; order?: number }>(
  items: T[],
  orderedIds: string[],
): T[] {
  const rank = new Map(orderedIds.map((id, index) => [id, index]))
  return [...items]
    .map((item) => (rank.has(item.id) ? { ...item, order: rank.get(item.id)! } : item))
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
  const byId = new Map(items.map((item) => [item.id, item]))
  const visible = new Set(orderedVisibleIds)
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const slots: number[] = []
  sorted.forEach((item, index) => {
    if (visible.has(item.id)) slots.push(index)
  })
  const next = [...sorted]
  orderedVisibleIds.forEach((id, index) => {
    const item = byId.get(id)
    if (item && index < slots.length) next[slots[index]] = item
  })
  return next.map((item, index) => ({ ...item, order: index }))
}

export interface BookmarksContextValue {
  bookmarks: Bookmark[]
  collections: Collection[]
  /** 登录后拉取书库期间为 true */
  loading: boolean
  addBookmark: (input: BookmarkInput) => Promise<Bookmark>
  updateBookmark: (id: string, patch: Partial<BookmarkInput>) => Promise<void>
  removeBookmark: (id: string) => Promise<void>
  bulkAdd: (drafts: BookmarkDraft[]) => Promise<BulkAddResult>
  bulkUpdate: (ids: string[], patch: Partial<BookmarkInput>) => Promise<void>
  bulkRemove: (ids: string[]) => Promise<void>
  findDuplicate: (url: string, exceptId?: string) => Bookmark | undefined
  addCollection: (name: string, icon?: string) => Promise<Collection>
  renameCollection: (id: string, name: string, icon?: string) => Promise<void>
  removeCollection: (id: string) => Promise<void>
  /** 导入时按名称批量建分组，返回（新建的 + 已存在的）分组供建「文件夹名 → id」映射 */
  bulkCreateCollections: (names: string[]) => Promise<Collection[]>
  reorderBookmarks: (orderedIds: string[]) => Promise<void>
  reorderCollections: (orderedIds: string[]) => Promise<void>
  clearAll: () => Promise<void>
  downloadJson: () => void
  downloadNetscape: () => void
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null)

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)

  // 乐观更新的回滚快照 + 闭包里读最新状态用。
  // 每次 render 后同步，所以回调里读到的永远是最新一份。
  const stateRef = useRef({ bookmarks, collections })
  stateRef.current = { bookmarks, collections }

  useEffect(() => {
    if (status !== 'authenticated') {
      // 登出即清空，避免换账号后看到上一个账号的数据
      setBookmarks([])
      setCollections([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void api
      .get<LibraryResponse>('/library')
      .then((data) => {
        if (cancelled) return
        setBookmarks(data.bookmarks)
        setCollections(data.collections)
      })
      .catch(() => {
        // 401 已由 api 层统一转成未登录状态，这里不重复提示
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [status])

  /**
   * 乐观更新：先改本地再发请求，失败整份回滚。
   * 只用于改动局部、且不需要服务端返回值的操作（改 / 删 / 排序）。
   */
  const optimistic = useCallback(
    async (apply: () => void, send: () => Promise<unknown>): Promise<void> => {
      const before = stateRef.current
      apply()
      try {
        await send()
      } catch (err) {
        setBookmarks(before.bookmarks)
        setCollections(before.collections)
        throw err
      }
    },
    [],
  )

  // —— 书签 ——

  /** 新增等服务端权威结果：需要它生成的 id、归一化后的 url 与 order */
  const addBookmark = useCallback(async (input: BookmarkInput): Promise<Bookmark> => {
    const res = await api.post<{ bookmark: Bookmark }>('/bookmarks', input)
    setBookmarks((prev) => [...prev, res.bookmark])
    return res.bookmark
  }, [])

  const updateBookmark = useCallback(
    (id: string, patch: Partial<BookmarkInput>) =>
      optimistic(
        () =>
          setBookmarks((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, ...patch, domain: patch.url ? extractDomain(patch.url) : item.domain }
                : item,
            ),
          ),
        () => api.patch(`/bookmarks/${id}`, patch),
      ),
    [optimistic],
  )

  const removeBookmark = useCallback(
    (id: string) =>
      optimistic(
        () => setBookmarks((prev) => prev.filter((item) => item.id !== id)),
        () => api.del(`/bookmarks/${id}`),
      ),
    [optimistic],
  )

  const bulkAdd = useCallback(async (drafts: BookmarkDraft[]): Promise<BulkAddResult> => {
    const res = await api.post<{ created: number; skipped: number; bookmarks: Bookmark[] }>(
      '/bookmarks/bulk',
      { drafts },
    )
    // 以服务端返回为准：被跳过的重复项不会出现在 bookmarks 里
    setBookmarks((prev) => [...prev, ...res.bookmarks])
    return { created: res.created, skipped: res.skipped }
  }, [])

  const bulkUpdate = useCallback(
    (ids: string[], patch: Partial<BookmarkInput>) => {
      const target = new Set(ids)
      return optimistic(
        () =>
          setBookmarks((prev) =>
            prev.map((item) => (target.has(item.id) ? { ...item, ...patch } : item)),
          ),
        () => api.patch('/bookmarks/bulk', { ids, patch }),
      )
    },
    [optimistic],
  )

  const bulkRemove = useCallback(
    (ids: string[]) => {
      const target = new Set(ids)
      return optimistic(
        () => setBookmarks((prev) => prev.filter((item) => !target.has(item.id))),
        () => api.post('/bookmarks/bulk-delete', { ids }),
      )
    },
    [optimistic],
  )

  const reorderBookmarks = useCallback(
    (orderedIds: string[]) => {
      // 服务端要求提交全量顺序，先把可见子集展开成全局顺序
      const next = reorderVisibleInGlobal(stateRef.current.bookmarks, orderedIds)
      return optimistic(
        () => setBookmarks(next),
        () => api.put('/bookmarks/order', { orderedIds: next.map((item) => item.id) }),
      )
    },
    [optimistic],
  )

  const findDuplicate = useCallback((url: string, exceptId?: string) => {
    const key = dedupeKey(url)
    return stateRef.current.bookmarks.find(
      (item) => item.id !== exceptId && dedupeKey(item.url) === key,
    )
  }, [])

  // —— 分组 ——

  const addCollection = useCallback(async (name: string, icon?: string): Promise<Collection> => {
    const res = await api.post<{ collection: Collection }>('/collections', { name, icon })
    setCollections((prev) => [...prev, res.collection])
    return res.collection
  }, [])

  const renameCollection = useCallback(
    (id: string, name: string, icon?: string) =>
      optimistic(
        () =>
          setCollections((prev) =>
            prev.map((item) => (item.id === id ? { ...item, name, icon } : item)),
          ),
        () => api.patch(`/collections/${id}`, { name, icon }),
      ),
    [optimistic],
  )

  const removeCollection = useCallback(
    (id: string) =>
      optimistic(
        () => {
          setCollections((prev) => prev.filter((item) => item.id !== id))
          // 服务端是 ON DELETE SET NULL，本地同步置空，避免留下悬空的 collectionId
          setBookmarks((prev) =>
            prev.map((item) =>
              item.collectionId === id ? { ...item, collectionId: undefined } : item,
            ),
          )
        },
        () => api.del(`/collections/${id}`),
      ),
    [optimistic],
  )

  const bulkCreateCollections = useCallback(async (names: string[]): Promise<Collection[]> => {
    const res = await api.post<{ collections: Collection[] }>('/collections/bulk', { names })
    setCollections((prev) => {
      const have = new Set(prev.map((item) => item.id))
      return [...prev, ...res.collections.filter((item) => !have.has(item.id))]
    })
    return res.collections
  }, [])

  const reorderCollections = useCallback(
    (orderedIds: string[]) => {
      const next = reorderByIds(stateRef.current.collections, orderedIds)
      return optimistic(
        () => setCollections(next),
        () => api.put('/collections/order', { orderedIds: next.map((item) => item.id) }),
      )
    },
    [optimistic],
  )

  // —— 整库 ——

  const clearAll = useCallback(async () => {
    await api.del('/library')
    setBookmarks([])
    setCollections([])
  }, [])

  // 导出直接从内存生成，不必再请求服务端
  const downloadJson = useCallback(() => {
    const { bookmarks: list, collections: groups } = stateRef.current
    const blob = new Blob([JSON.stringify({ version: 4, bookmarks: list, collections: groups }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mybookmarks-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [])

  const downloadNetscape = useCallback(() => {
    const { bookmarks: list, collections: groups } = stateRef.current
    const blob = new Blob([exportNetscape(list, groups)], { type: 'text/html;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bookmarks-${new Date().toISOString().slice(0, 10)}.html`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [])

  const value = useMemo<BookmarksContextValue>(
    () => ({
      bookmarks,
      collections,
      loading,
      addBookmark,
      updateBookmark,
      removeBookmark,
      bulkAdd,
      bulkUpdate,
      bulkRemove,
      findDuplicate,
      addCollection,
      renameCollection,
      removeCollection,
      bulkCreateCollections,
      reorderBookmarks,
      reorderCollections,
      clearAll,
      downloadJson,
      downloadNetscape,
    }),
    [
      bookmarks,
      collections,
      loading,
      addBookmark,
      updateBookmark,
      removeBookmark,
      bulkAdd,
      bulkUpdate,
      bulkRemove,
      findDuplicate,
      addCollection,
      renameCollection,
      removeCollection,
      bulkCreateCollections,
      reorderBookmarks,
      reorderCollections,
      clearAll,
      downloadJson,
      downloadNetscape,
    ],
  )

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>
}

export function useBookmarks(): BookmarksContextValue {
  const ctx = useContext(BookmarksContext)
  if (!ctx) throw new Error('useBookmarks 必须在 BookmarksProvider 内使用')
  return ctx
}
