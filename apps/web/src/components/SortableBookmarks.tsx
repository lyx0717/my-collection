import { useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { DUR, EASE_CSS } from '../lib/motion'

interface SortableBookmarksProps {
  ids: string[]
  disabled?: boolean
  onReorder: (orderedIds: string[]) => void
  /** 拖起时浮起的副本（由调用方按视图渲染） */
  renderOverlay?: (id: string) => ReactNode
  children: ReactNode
}

/**
 * 列表视图的排序容器。
 * 拖拽激活距离 6px，避免与点击冲突。
 *
 * 网格 / 磁贴不排序：那两个视图是纯浏览面，卡片上既没有拖拽锚点，
 * 也没有编辑 / 删除入口 —— 所有改动书签的动作统一收在列表视图。
 */
export default function SortableBookmarks({
  ids,
  disabled = false,
  onReorder,
  renderOverlay,
  children,
}: SortableBookmarksProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id))

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        {children}
      </SortableContext>

      {/* 浮起副本：跟手 + 落位一次回弹；原项留在原地做半透明占位。
          倾角收到 0.35deg —— 慢节奏下大倾角会显得刻意 */}
      <DragOverlay dropAnimation={{ duration: DUR[4] * 1000, easing: EASE_CSS.inOut }}>
        {activeId && renderOverlay ? (
          <div style={{ transform: 'scale(1.015) rotate(0.35deg)', cursor: 'grabbing' }}>
            {renderOverlay(activeId)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
