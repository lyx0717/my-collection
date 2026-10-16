import { useEffect, useState } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { ApiError } from '../lib/api'
import { clearLocalStore, readLocalStore } from '../lib/localStore'
import { useBookmarks } from '../store/BookmarksContext'
import { useToast } from './Toast'

/**
 * 老版本的旧档还躺在本机 localStorage 里。
 * 首次登录且账号书库为空时提示导入 —— 只有服务端确认写入成功才删本地数据，
 * 失败时原样保留，用户可以稍后重试。
 */
export default function LocalMigrationBanner() {
  const { bookmarks, bulkAdd, bulkCreateCollections } = useBookmarks()
  const toast = useToast()
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (bookmarks.length > 0) return
    const local = readLocalStore()
    if (local && local.bookmarks.length > 0) setCount(local.bookmarks.length)
  }, [bookmarks.length])

  if (count === 0) return null

  const run = async () => {
    const local = readLocalStore()
    if (!local) {
      setCount(0)
      return
    }
    setBusy(true)
    try {
      // 分组 id 由服务端生成，先按名称批量建组拿到映射
      const names = [...new Set(local.collections.map((c) => c.name))]
      const created = names.length ? await bulkCreateCollections(names) : []
      const idByLocalId = new Map<string, string>()
      for (const col of local.collections) {
        const hit = created.find((c) => c.name === col.name)
        if (hit) idByLocalId.set(col.id, hit.id)
      }

      const result = await bulkAdd(
        local.bookmarks.map((b) => ({
          url: b.url,
          title: b.title,
          description: b.description,
          faviconUrl: b.faviconUrl,
          cover: b.cover,
          collectionId: b.collectionId ? idByLocalId.get(b.collectionId) : undefined,
          createdAt: b.createdAt,
        })),
      )

      // 到这里才删本地：确认服务端已经收下了
      clearLocalStore()
      setCount(0)
      toast(
        result.skipped > 0
          ? `已导入 ${result.created} 条，跳过 ${result.skipped} 条重复`
          : `已导入 ${result.created} 条本地书签`,
      )
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : '导入失败，本地数据已保留，可稍后重试',
        'err',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass-card mb-4 flex flex-wrap items-center gap-3 rounded-[16px] border px-4 py-3">
      <Upload size={16} className="shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-[12.5px] leading-5 text-ink2">
        检测到本机还有 <b className="tabular-nums">{count}</b> 条旧版书签，要导入到当前账号吗？
        导入成功后会清除本机数据。
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="flex h-8 items-center gap-1.5 rounded-[9px] bg-accent px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-ink disabled:opacity-60"
        >
          {busy && <Loader2 size={13} className="animate-spin" />}
          {busy ? '正在导入…' : '导入'}
        </button>
        <button
          type="button"
          onClick={() => setCount(0)}
          aria-label="暂不导入"
          className="flex h-8 w-8 items-center justify-center rounded-[9px] text-ink3 transition-colors hover:bg-surface-2"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
