import type { ReactNode } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import type { ViewMode } from '../types'

interface SortableBookmarksProps {
  ids: string[]
  view: ViewMode
  disabled?: boolean
  onReorder: (orderedIds: string[]) => void
  children: ReactNode
}

/**
 * 书签排序容器：三视图共用。
 * 列表用垂直策略，网格/磁贴用矩形策略。
 * 拖拽激活距离 6px，避免与点击冲突。
 */
export default function SortableBookmarks({
  ids,
  view,
  disabled = false,
  onReorder,
  children,
}: SortableBookmarksProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={view === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
        disabled={disabled}
      >
        {children}
      </SortableContext>
    </DndContext>
  )
}
