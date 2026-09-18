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
import {
  checkHealth,
  clearSyncConfig,
  fetchCloud,
  loadSyncConfig,
  saveCloud,
  saveSyncConfig,
  type SyncConfig,
} from '../lib/sync'

const STORAGE_KEY = 'mybookmarks:v2'

export type SyncStatus = 'loading' | 'cloud' | 'syncing' | 'offline' | 'local'

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

function loadLocal(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isStore(parsed)) return parsed
    }
  } catch {
    // 损坏回落示例
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
  status: SyncStatus
  lastSyncedAt: string | null
  syncError: string | null
  hasSyncConfig: boolean
  pendingCount: number
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
  replaceAll: (data: StoreShape) => void
  resetToSeed: () => void
  clearAll: () => void
  downloadJson: () => void
  downloadNetscape: () => void
  storageBytes: number
  configureSync: (cfg: SyncConfig, mode: 'merge' | 'cloud' | 'local') => Promise<void>
  disconnectSync: () => void
  retrySync: () => void
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null)

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreShape>(() => loadLocal())
  const [status, setStatus] = useState<SyncStatus>('loading')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [cfg, setCfg] = useState<SyncConfig | null>(() => loadSyncConfig())
  const [storageBytes, setStorageBytes] = useState(0)

  const hydrated = useRef(false)
  const initDone = useRef(false)
  const saveTimer = useRef<number | undefined>(undefined)
  const storeRef = useRef(store)
  const cfgRef = useRef(cfg)
  const cloudMode = status === 'cloud' || status === 'syncing' || status === 'offline'
  const cloudModeRef = useRef(cloudMode)
  storeRef.current = store
  cfgRef.current = cfg
  cloudModeRef.current = cloudMode

  // 初始化：有同步配置则拉云端，决定迁移/缓存/离线
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    const config = loadSyncConfig()
    const local = loadLocal()
    setStorageBytes(new Blob([localStorage.getItem(STORAGE_KEY) ?? '']).size)
    if (!config) {
      setStore(local)
      setStatus('local')
      return
    }
    setCfg(config)
    ;(async () => {
      try {
        const cloud = await fetchCloud(config)
        if (cloud && isStore(cloud)) {
          setStore(cloud)
          persistLocal(cloud)
        } else {
          // 云端为空：本地有数据则首次迁移上传
          await saveCloud(config, local)
          setStore(local)
          persistLocal(local)
          setLastSyncedAt(new Date().toISOString())
        }
        setStatus('cloud')
        setSyncError(null)
      } catch (err) {
        setStore(local)
        setStatus('offline')
        setSyncError(err instanceof Error ? err.message : '无法连接云端，当前显示本地缓存')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function persistLocal(data: StoreShape) {
    const text = JSON.stringify(data)
    localStorage.setItem(STORAGE_KEY, text)
    setStorageBytes(new Blob([text]).size)
  }

  // 统一变更入口：立即更新 UI，本地缓存；云端模式防抖上传
  const commit = useCallback((updater: (s: StoreShape) => StoreShape) => {
    setStore((prev) => {
      const next = updater(prev)
      persistLocal(next)
      if (cloudModeRef.current && cfgRef.current) {
        scheduleCloudSave(next)
      }
      return next
    })
  }, [])

  const scheduleCloudSave = useCallback((data: StoreShape) => {
    setStatus('syncing')
    setPendingCount((n) => n + 1)
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const config = cfgRef.current
      if (!config) return
      try {
        await saveCloud(config, data)
        setLastSyncedAt(new Date().toISOString())
        setSyncError(null)
        setPendingCount(0)
        setStatus('cloud')
      } catch (err) {
        setStatus('offline')
        setSyncError(err instanceof Error ? err.message : '同步失败，改动已保存在本地')
      }
    }, 700)
  }, [])

  const retrySync = useCallback(() => {
    const config = cfgRef.current
    if (!config) return
    setStatus('syncing')
    saveCloud(config, storeRef.current)
      .then(() => {
        setLastSyncedAt(new Date().toISOString())
        setSyncError(null)
        setPendingCount(0)
        setStatus('cloud')
      })
      .catch((err) => {
        setStatus('offline')
        setSyncError(err instanceof Error ? err.message : '同步失败')
      })
  }, [])

  // 网络恢复后自动补传
  useEffect(() => {
    const onOnline = () => {
      if (cloudModeRef.current && cfgRef.current) retrySync()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [retrySync])

  // 非云端模式保持直接写 localStorage（开发期与未配置时）
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    if (status === 'local') persistLocal(store)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, status])

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
        order: store.collections.length,
      }
      commit((s) => ({ ...s, collections: [...s.collections, created] }))
      return created
    },
    [commit, store.collections.length],
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

  const replaceAll = useCallback((data: StoreShape) => commit(() => data), [commit])
  const resetToSeed = useCallback(() => commit(() => structuredClone(SEED_DATA)), [commit])
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

  // 设置页配置云同步
  const configureSync = useCallback(
    async (newCfg: SyncConfig, mode: 'merge' | 'cloud' | 'local') => {
      await checkHealth(newCfg)
      const cloud = await fetchCloud(newCfg)
      const local = storeRef.current
      if (mode === 'cloud' && cloud && isStore(cloud)) {
        setStore(cloud)
        persistLocal(cloud)
      } else if (mode === 'local' || !cloud) {
        await saveCloud(newCfg, local)
        setStore(local)
        persistLocal(local)
      } else {
        // merge：云端为主，本地独有书签并入，同名分组复用
        const merged: StoreShape = {
          version: 2,
          collections: [...cloud.collections],
          bookmarks: [...cloud.bookmarks],
        }
        const colIdByName = new Map(cloud.collections.map((c) => [c.name, c.id]))
        for (const col of local.collections) {
          if (colIdByName.has(col.name)) continue
          merged.collections.push(col)
          colIdByName.set(col.name, col.id)
        }
        const have = new Set(cloud.bookmarks.map((b) => dedupeKey(b.url)))
        for (const bm of local.bookmarks) {
          if (have.has(dedupeKey(bm.url))) continue
          const localCol = local.collections.find((c) => c.id === bm.collectionId)
          merged.bookmarks.push({
            ...bm,
            id: uid(),
            collectionId: localCol ? colIdByName.get(localCol.name) : undefined,
          })
          have.add(dedupeKey(bm.url))
        }
        await saveCloud(newCfg, merged)
        setStore(merged)
        persistLocal(merged)
      }
      saveSyncConfig(newCfg)
      setCfg(newCfg)
      cfgRef.current = newCfg
      setLastSyncedAt(new Date().toISOString())
      setStatus('cloud')
      setSyncError(null)
    },
    [],
  )

  const disconnectSync = useCallback(() => {
    clearSyncConfig()
    setCfg(null)
    cfgRef.current = null
    setStatus('local')
  }, [])

  const value = useMemo<BookmarksContextValue>(
    () => ({
      bookmarks: store.bookmarks,
      collections: store.collections,
      status,
      lastSyncedAt,
      syncError,
      hasSyncConfig: Boolean(cfg),
      pendingCount,
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
      replaceAll,
      resetToSeed,
      clearAll,
      downloadJson,
      downloadNetscape,
      storageBytes,
      configureSync,
      disconnectSync,
      retrySync,
    }),
    [
      store,
      status,
      lastSyncedAt,
      syncError,
      cfg,
      pendingCount,
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
      replaceAll,
      resetToSeed,
      clearAll,
      downloadJson,
      downloadNetscape,
      storageBytes,
      configureSync,
      disconnectSync,
      retrySync,
    ],
  )

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>
}

export function useBookmarks(): BookmarksContextValue {
  const ctx = useContext(BookmarksContext)
  if (!ctx) throw new Error('useBookmarks 必须在 BookmarksProvider 内使用')
  return ctx
}
