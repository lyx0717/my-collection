import { useState } from 'react'
import { CheckSquare, FolderInput, Star, Tag, Trash2, X } from 'lucide-react'
import type { Collection } from '../types'
import { useToast } from './Toast'

interface BatchToolbarProps {
  selectedCount: number
  totalCount: number
  collections: Collection[]
  allSelected: boolean
  onSelectAll: () => void
  onClear: () => void
  onMove: (collectionId: string | undefined) => void
  onAddTags: (tags: string[]) => void
  onStar: () => void
  onDelete: () => void
}

export default function BatchToolbar({
  selectedCount,
  totalCount,
  collections,
  allSelected,
  onSelectAll,
  onClear,
  onMove,
  onAddTags,
  onStar,
  onDelete,
}: BatchToolbarProps) {
  const toast = useToast()
  const [tagDraft, setTagDraft] = useState('')

  const submitTags = () => {
    const tags = tagDraft
      .split(/[,，、]/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
    if (!tags.length) return
    onAddTags(tags)
    setTagDraft('')
    toast(`已为 ${selectedCount} 条书签添加标签`)
  }

  const btnCls =
    'flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12px] font-medium text-ink2 hover:border-line2 hover:bg-surface-2'

  return (
    <div className="animate-rise mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-accent/30 bg-accent-soft/40 px-3 py-2.5">
      <button onClick={onSelectAll} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent-ink">
        <CheckSquare size={14} />
        {allSelected ? `取消全选（${selectedCount}）` : `已选 ${selectedCount} / ${totalCount}`}
      </button>

      <span className="mx-1 h-4 w-px bg-line2" />

      {/* 移动到分组 */}
      <div className="relative flex items-center">
        <FolderInput size={13} className="pointer-events-none absolute left-2 text-ink3" />
        <select
          value=""
          onChange={(e) => {
            if (!e.target.value) return
            const label = e.target.selectedOptions[0].textContent
            if (e.target.value === '__none__') {
              onMove(undefined)
              toast(`${selectedCount} 条已移到未分组`)
            } else {
              onMove(e.target.value)
              toast(`${selectedCount} 条已移到「${label}」`)
            }
            e.target.value = ''
          }}
          className="h-8 appearance-none rounded-lg border border-line bg-white pl-7 pr-6 text-[12px] font-medium text-ink2 outline-none"
        >
          <option value="">移动到分组…</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji ? `${c.emoji} ` : ''}
              {c.name}
            </option>
          ))}
          <option value="__none__">未分组</option>
        </select>
      </div>

      {/* 加标签 */}
      <div className="flex items-center gap-1">
        <Tag size={13} className="text-ink3" />
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitTags()}
          placeholder="加标签，回车"
          className="h-8 w-28 rounded-lg border border-line bg-white px-2 text-[12px] outline-none placeholder:text-[#b5b1a8] focus:border-accent sm:w-32"
        />
      </div>

      <button onClick={onStar} className={btnCls}>
        <Star size={13} />
        加星标
      </button>
      <button onClick={onDelete} className={`${btnCls} hover:border-danger/40 hover:text-danger`}>
        <Trash2 size={13} />
        删除
      </button>

      <button
        onClick={onClear}
        aria-label="退出多选"
        className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-ink3 hover:bg-white hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  )
}
