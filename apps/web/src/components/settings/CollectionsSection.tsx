import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { useBookmarks } from '../../store/BookmarksContext'
import { iconForCollection } from '../../lib/collectionIcons'
import type { Collection } from '../../types'
import SectionTitle from './SectionTitle'

interface Props {
  onEdit: (col: Collection) => void
  onCreate: () => void
  onDelete: (col: Collection) => void
}

/** 分组图标：与导航栏同一个取图逻辑，保证「设置里看到的 = 导航里显示的」 */
function CollectionIcon({ collection, size }: { collection: Collection; size: number }) {
  const Icon = iconForCollection(collection)
  return <Icon size={size} strokeWidth={1.8} />
}

/** 单行：拖拽手柄 + 图标 + 名称 + 计数 + 编辑删除 */
function CollectionRow({
  col,
  count,
  onEdit,
  onDelete,
}: {
  col: Collection
  count: number
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2.5 rounded-[20px] border border-line2/60 bg-surface/40 px-3 py-2.5 transition-colors hover:bg-surface/70 ${
        isDragging ? 'z-10 opacity-70 shadow-xl ring-2 ring-accent/40' : ''
      }`}
    >
      <button
        type="button"
        aria-label={`拖拽排序 ${col.name}`}
        title="拖拽排序"
        className="flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center text-ink3 hover:text-ink active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-ink2">
        <CollectionIcon collection={col} size={16} />
      </span>

      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{col.name}</span>
      <span className="shrink-0 text-[12px] tabular-nums text-ink3">{count} 条</span>

      <div className="flex shrink-0 gap-0.5">
        <button
          aria-label={`编辑分组 ${col.name}`}
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-[9px] text-ink3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Pencil size={14} />
        </button>
        <button
          aria-label={`删除分组 ${col.name}`}
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-[9px] text-ink3 transition-colors hover:bg-surface-2 hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function CollectionsSection({ onEdit, onCreate, onDelete }: Props) {
  const { bookmarks, collections, reorderCollections } = useBookmarks()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = collections.findIndex((c) => c.id === active.id)
    const newIndex = collections.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    void reorderCollections(arrayMove(collections, oldIndex, newIndex).map((c) => c.id))
  }

  return (
    <section id="sec-collections" className="scroll-mt-32">
      <SectionTitle
        title="分组管理"
        desc="首页导航只读，分组的增删改与排序都在这里。删除分组不会删除书签，它们会回到「全部」。"
      />
      <div className="glass-card rounded-[20px] border border-line2/60 p-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={collections.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {collections.map((col) => (
                <CollectionRow
                  key={col.id}
                  col={col}
                  count={bookmarks.filter((b) => b.collectionId === col.id).length}
                  onEdit={() => onEdit(col)}
                  onDelete={() => onDelete(col)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {collections.length === 0 && (
          <p className="py-4 text-center text-[13px] text-ink3">还没有分组</p>
        )}

        <button
          onClick={onCreate}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-line2 text-[13px] font-medium text-ink2 transition-colors hover:border-accent hover:text-accent"
        >
          ＋ 新建分组
        </button>
      </div>
    </section>
  )
}
