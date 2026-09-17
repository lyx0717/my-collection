import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import type { Item, ItemInput } from '../types'
import { useCollection } from '../store/CollectionContext'
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories'
import { formatAccession } from '../utils/filter'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import AdminItemForm from './AdminItemForm'

type Toast = { kind: 'ok' | 'err'; text: string } | null

export default function AdminPage() {
  const { items, accessionOf, addItem, updateItem, removeItem, importItems, resetToSeed, exportItems } =
    useCollection()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Item | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Item | null>(null)
  const [resetting, setResetting] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = (t: NonNullable<Toast>) => {
    setToast(t)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }

  const sorted = useMemo(
    () =>
      [...items]
        .filter((i) => {
          const q = query.trim().toLowerCase()
          if (!q) return true
          return [i.title, i.source ?? '', i.tags.join(' ')]
            .join(' ')
            .toLowerCase()
            .includes(q)
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items, query],
  )

  const handleSubmit = (input: ItemInput) => {
    if (editing) {
      updateItem(editing.id, input)
      showToast({ kind: 'ok', text: `已保存对「${input.title}」的修改` })
      setEditing(null)
    } else {
      addItem(input)
      showToast({ kind: 'ok', text: `「${input.title}」已收入馆藏` })
      setCreating(false)
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const count = importItems(text)
      showToast({ kind: 'ok', text: `成功导入 ${count} 件藏品` })
    } catch (err) {
      showToast({ kind: 'err', text: err instanceof Error ? err.message : '导入失败，请检查文件格式' })
    }
  }

  const confirmDelete = () => {
    if (!deleting) return
    removeItem(deleting.id)
    showToast({ kind: 'ok', text: `「${deleting.title}」已移出馆藏` })
    setDeleting(null)
  }

  const confirmReset = () => {
    resetToSeed()
    setResetting(false)
    showToast({ kind: 'ok', text: '已恢复为内置示例藏品' })
  }

  return (
    <div className="pb-16 pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs tracking-wide text-paper-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={13} />
            返回藏品馆
          </Link>
          <h1 className="mt-3 font-serif text-3xl tracking-[0.1em] text-paper">馆藏管理</h1>
          <p className="mt-2 text-sm text-paper-muted">
            共 {items.length} 件藏品，改动自动保存在此浏览器中。
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-bright"
        >
          <Plus size={16} strokeWidth={2.2} />
          新增藏品
        </button>
      </div>

      {/* 工具行 */}
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="在管理列表中筛选……"
            className="h-10 w-full rounded-md border border-ink-700 bg-ink-900 pl-10 pr-3 text-sm text-paper placeholder:text-paper-muted/70 focus:border-gold/60 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportItems}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-2 text-xs text-paper-dim transition-colors hover:border-gold/45 hover:text-paper"
          >
            <Download size={13} />
            导出 JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-2 text-xs text-paper-dim transition-colors hover:border-gold/45 hover:text-paper"
          >
            <Upload size={13} />
            导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => setResetting(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-2 text-xs text-paper-dim transition-colors hover:border-red-400/50 hover:text-red-300"
          >
            <RotateCcw size={13} />
            恢复示例
          </button>
        </div>
      </div>

      <div className="rule-gold mt-6" />

      {/* 列表 */}
      {sorted.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={query ? '没有匹配的藏品' : '馆藏还是空的'}
            hint={query ? '换个关键词试试。' : '从第一件藏品开始，建立你的私人藏品馆。'}
            action={
              !query && (
                <button
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink-950 hover:bg-gold-bright"
                >
                  <Plus size={15} />
                  新增藏品
                </button>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-ink-800/80 rounded-lg border border-ink-800 bg-ink-900/40">
          {sorted.map((item) => {
            const meta = CATEGORIES[item.category]
            return (
              <li
                key={item.id}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-ink-850/70 sm:px-5"
              >
                <Cover item={item} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-wider text-gold/70">
                      {formatAccession(accessionOf(item.id) ?? 0)}
                    </span>
                    <span
                      className="rounded-sm border px-1.5 py-px text-[10px]"
                      style={{ borderColor: `${meta.tint}44`, color: meta.tint }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-serif text-base text-paper">{item.title}</p>
                  <p className="truncate text-xs text-paper-muted">
                    {[item.source, item.tags.length > 0 ? `# ${item.tags.join('  # ')}` : '']
                      .filter(Boolean)
                      .join('　·　')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`访问 ${item.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-paper-muted transition-colors hover:text-gold"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => setEditing(item)}
                    aria-label={`编辑 ${item.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-paper-muted transition-colors hover:text-gold"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleting(item)}
                    aria-label={`删除 ${item.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-paper-muted transition-colors hover:text-red-300"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* 分类速览 */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORY_ORDER.map((key) => {
          const meta = CATEGORIES[key]
          const count = items.filter((i) => i.category === key).length
          return (
            <div key={key} className="rounded-lg border border-ink-800 bg-ink-900/40 px-4 py-3">
              <div className="flex items-center gap-2" style={{ color: meta.tint }}>
                <meta.icon size={14} strokeWidth={1.7} />
                <span className="text-xs tracking-widest">{meta.label}</span>
              </div>
              <p className="mt-2 font-mono text-xl text-paper">{count}</p>
            </div>
          )
        })}
      </div>

      {(creating || editing) && (
        <AdminItemForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="移出这件藏品？"
          message={`「${deleting.title}」将从馆藏中删除，此操作无法撤销。`}
          confirmText="删除"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {resetting && (
        <ConfirmDialog
          title="恢复为内置示例？"
          message="当前浏览器里的全部藏品将被 16 件示例藏品覆盖。建议先导出备份。"
          confirmText="恢复示例"
          danger
          onConfirm={confirmReset}
          onCancel={() => setResetting(false)}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`animate-rise fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md border px-4 py-2.5 text-sm shadow-xl ${
            toast.kind === 'ok'
              ? 'border-gold/40 bg-ink-850 text-paper'
              : 'border-red-400/40 bg-ink-850 text-red-300'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}

function ConfirmDialog({
  title,
  message,
  confirmText,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmText: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="animate-fade-in fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="animate-rise w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg text-paper">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-paper-dim">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-ink-600 px-4 py-2 text-sm text-paper-dim hover:border-gold/40 hover:text-paper"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              danger
                ? 'bg-red-500/90 text-white hover:bg-red-500'
                : 'bg-gold text-ink-950 hover:bg-gold-bright'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
