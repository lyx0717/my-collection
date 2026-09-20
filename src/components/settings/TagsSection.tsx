import { useMemo, useState } from 'react'
import { Pencil, Tag, Trash2, X } from 'lucide-react'
import { useBookmarks } from '../../store/BookmarksContext'
import { useToast } from '../Toast'
import SectionTitle from './SectionTitle'

interface Props {
  onDeleteTag: (tag: string, count: number) => void
}

export default function TagsSection({ onDeleteTag }: Props) {
  const { bookmarks, renameTag } = useBookmarks()
  const toast = useToast()
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [tagDraft, setTagDraft] = useState('')

  const tagStats = useMemo(() => {
    const counter = new Map<string, number>()
    for (const bm of bookmarks) for (const t of bm.tags) counter.set(t, (counter.get(t) ?? 0) + 1)
    return [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
  }, [bookmarks])

  const saveTag = (oldName: string) => {
    const next = tagDraft.trim()
    if (!next) return
    if (next !== oldName && tagStats.some(([t]) => t === next)) {
      toast('已存在同名标签，将自动合并', 'err')
    }
    renameTag(oldName, next)
    setEditingTag(null)
  }

  return (
    <section id="sec-tags" className="scroll-mt-24">
      <SectionTitle
        title="标签管理"
        desc="重命名会同步到所有书签；删除标签只移除标记，不删除书签。"
      />
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
        {tagStats.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-ink3">还没有标签</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagStats.map(([tag, count]) =>
              editingTag === tag ? (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-lg border border-accent/40 bg-accent-soft py-1 pl-3 pr-1"
                >
                  #
                  <input
                    autoFocus
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTag(tag)
                      if (e.key === 'Escape') setEditingTag(null)
                    }}
                    className="w-24 bg-transparent text-[12.5px] font-medium text-accent-ink"
                  />
                  <button
                    aria-label="保存标签名"
                    onClick={() => saveTag(tag)}
                    className="flex h-6 w-6 items-center justify-center rounded bg-accent text-white"
                  >
                    ✓
                  </button>
                  <button
                    aria-label="取消"
                    onClick={() => setEditingTag(null)}
                    className="flex h-6 w-6 items-center justify-center rounded text-ink3 hover:bg-white"
                  >
                    <X size={12} />
                  </button>
                </span>
              ) : (
                <span
                  key={tag}
                  className="group/tag flex items-center gap-1 rounded-lg border border-line bg-surface-2 py-1 pl-2.5 pr-1 text-[12.5px] text-ink2"
                >
                  <Tag size={11} className="text-ink3" />
                  {tag}
                  <span className="text-[11px] text-ink3">{count}</span>
                  <button
                    aria-label={`重命名标签 ${tag}`}
                    onClick={() => {
                      setEditingTag(tag)
                      setTagDraft(tag)
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-ink3 hover:bg-white hover:text-ink"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    aria-label={`删除标签 ${tag}`}
                    onClick={() => onDeleteTag(tag, count)}
                    className="flex h-6 w-6 items-center justify-center rounded text-ink3 hover:bg-white hover:text-danger"
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  )
}
