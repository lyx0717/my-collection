import { useState } from 'react'
import { CheckCircle2, Cloud, CloudOff, Loader2, RefreshCw, Unlink, Wifi } from 'lucide-react'
import { useBookmarks } from '../../store/BookmarksContext'
import { useToast } from '../Toast'
import type { SyncConfig } from '../../lib/sync'

type ResolveMode = 'merge' | 'cloud' | 'local'

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { text: string; cls: string; icon: React.ReactNode }> = {
    cloud: {
      text: '已同步',
      cls: 'bg-[#e9f7ee] text-[#1e7c47]',
      icon: <CheckCircle2 size={13} />,
    },
    syncing: {
      text: '同步中…',
      cls: 'bg-accent-soft text-accent-ink',
      icon: <Loader2 size={13} className="animate-spin" />,
    },
    offline: {
      text: '离线（用本地缓存）',
      cls: 'bg-[#fdf1e2] text-[#8a5a1e]',
      icon: <CloudOff size={13} />,
    },
    local: {
      text: '仅本地存储',
      cls: 'bg-surface-2 text-ink2 border border-line',
      icon: <Wifi size={13} />,
    },
    loading: {
      text: '连接中…',
      cls: 'bg-surface-2 text-ink2 border border-line',
      icon: <Loader2 size={13} className="animate-spin" />,
    },
  }
  const s = map[status] ?? map.local
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${s.cls}`}>
      {s.icon}
      {s.text}
    </span>
  )
}

export default function SyncPanel() {
  const bm = useBookmarks()
  const toast = useToast()
  const [endpoint, setEndpoint] = useState('')
  const [token, setToken] = useState('')
  const [mode, setMode] = useState<ResolveMode>('merge')
  const [testing, setTesting] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const connect = async () => {
    const ep = endpoint.trim().replace(/\/+$/, '')
    if (!/^https?:\/\/.+/.test(ep)) {
      toast('请输入以 http(s):// 开头的 Worker 地址', 'err')
      return
    }
    if (!token.trim()) {
      toast('请输入访问密码', 'err')
      return
    }
    setTesting(true)
    try {
      const cfg: SyncConfig = { endpoint: ep, token: token.trim() }
      await bm.configureSync(cfg, mode)
      toast('云同步已开启')
      setEndpoint('')
      setToken('')
    } catch (err) {
      toast(err instanceof Error ? `连接失败：${err.message}` : '连接失败', 'err')
    } finally {
      setTesting(false)
    }
  }

  const inputCls =
    'h-10 w-full rounded-[10px] border border-line bg-white px-3 text-[13.5px] outline-none transition-shadow placeholder:text-[#b5b1a8] focus:border-accent focus:shadow-[0_0_0_3px_rgba(62,92,255,.12)]'

  if (bm.hasSyncConfig) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Cloud size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold">云端实时同步已开启</p>
            <p className="mt-0.5 truncate text-[12px] text-ink3">
              所有设备访问本站看到同一份书签
            </p>
          </div>
          <div className="ml-auto">
            <StatusPill status={bm.status} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-3">
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-ink3">上次同步</p>
            <p className="mt-0.5 font-medium">
              {bm.lastSyncedAt
                ? new Date(bm.lastSyncedAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-ink3">本地书签</p>
            <p className="mt-0.5 font-medium">{bm.bookmarks.length} 条</p>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-ink3">待保存</p>
            <p className="mt-0.5 font-medium">{bm.pendingCount} 项</p>
          </div>
        </div>

        {bm.syncError && (
          <p className="mt-3 rounded-lg bg-[#fdf1e2] px-3 py-2 text-[12px] leading-5 text-[#8a5a1e]">
            {bm.syncError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2.5">
          {bm.status === 'offline' && (
            <button
              onClick={bm.retrySync}
              className="flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3.5 text-[12.5px] font-semibold text-white hover:bg-accent-ink"
            >
              <RefreshCw size={13} />
              立即重试
            </button>
          )}
          <button
            onClick={() => {
              if (confirm('关闭后数据将只保存在本浏览器，云端数据保留。确定关闭？')) {
                bm.disconnectSync()
                toast('已关闭云同步，当前数据保留在本地')
              }
            }}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3.5 text-[12.5px] font-medium text-ink2 hover:border-danger/40 hover:text-danger"
          >
            <Unlink size={13} />
            关闭云同步
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink2">
          <Cloud size={19} />
        </span>
        <div>
          <p className="text-[14px] font-semibold">开启云端实时同步</p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-ink3">
            填入部署 Cloudflare Worker 后得到的地址和密码；当前浏览器里的 {bm.bookmarks.length}{' '}
            条书签会自动处理。
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink2">Worker 地址</label>
          <input
            className={inputCls}
            placeholder="https://my-bookmarks-api.你的账号.workers.dev"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink2">访问密码</label>
          <div className="relative">
            <input
              className={`${inputCls} pr-14`}
              type={showToken ? 'text' : 'password'}
              placeholder="部署时设置的 AUTH_TOKEN"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px] text-ink3 hover:bg-surface-2"
            >
              {showToken ? '隐藏' : '显示'}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink2">
            当云端已有数据时
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ['merge', '智能合并', '按网址去重，分组一并合并'],
                ['cloud', '以云端为准', '丢弃本地，使用云端数据'],
                ['local', '用本地覆盖', '把当前数据上传覆盖云端'],
              ] as Array<[ResolveMode, string, string]>
            ).map(([value, title, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  mode === value
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-white hover:border-line2'
                }`}
              >
                <p className={`text-[13px] font-semibold ${mode === value ? 'text-accent-ink' : ''}`}>
                  {title}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-ink3">{hint}</p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] leading-4 text-ink3">
            新部署的云端是空的，会自动把当前本地书签上传，无需关心此项。
          </p>
        </div>
        <button
          onClick={connect}
          disabled={testing}
          className="flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13.5px] font-semibold text-white hover:bg-accent-ink disabled:opacity-60"
        >
          {testing ? <Loader2 size={15} className="animate-spin" /> : <Cloud size={15} />}
          {testing ? '正在连接…' : '测试连接并开启同步'}
        </button>
      </div>
    </div>
  )
}
