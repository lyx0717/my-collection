import { Pencil, Trash2 } from 'lucide-react'
import { useBookmarks } from '../../store/BookmarksContext'
import type { Collection } from '../../types'
import SectionTitle from './SectionTitle'

interface Props {
  onEdit: (col: Collection) => void
  onCreate: () => void
  onDelete: (col: Collection) => void
}

export default function CollectionsSection({ onEdit, onCreate, onDelete }: Props) {
  const { bookmarks, collections } = useBookmarks()

  return (
    <section id="sec-collections" className="scroll-mt-24">
      <SectionTitle
        title="分组管理"
        desc="扁平一级分组；删除分组不会删除书签，它们会回到「未分组」。"
      />
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
        <div className="space-y-2">
          {collections.map((col) => {
            const count = bookmarks.filter((b) => b.collectionId === col.id).length
            return (
              <div
                key={col.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[15px]">
                  {col.emoji ?? '📁'}
                </span>
                <span className="text-[13.5px] font-medium">{col.name}</span>
                <span className="text-[12px] text-ink3">{count} 条</span>
                <div className="ml-auto flex gap-1">
                  <button
                    aria-label={`编辑分组 ${col.name}`}
                    onClick={() => onEdit(col)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink3 hover:bg-white hover:text-ink"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    aria-label={`删除分组 ${col.name}`}
                    onClick={() => onDelete(col)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink3 hover:bg-white hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          {collections.length === 0 && (
            <p className="py-4 text-center text-[13px] text-ink3">还没有分组</p>
          )}
        </div>

        <button
          onClick={onCreate}
          className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line2 text-[13px] font-medium text-ink2 hover:border-accent/50 hover:text-accent"
        >
          ＋ 新建分组
        </button>
      </div>
    </section>
  )
}
