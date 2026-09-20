import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Star, Trash2 } from 'lucide-react'
import type { Bookmark } from '../types'
import { shortDate } from '../lib/date'
import Favicon from './Favicon'
import StarButton from './StarButton'

interface BookmarkRowProps {
  bookmark: Bookmark
  collectionName?: string
  onEdit: (bm: Bookmark) => void
  onDelete: (bm: Bookmark) => void
  onToggleStar: (id: string) => void
  onTagClick?: (tag: string) => void
  onDomainClick?: (domain: string) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  sortable?: boolean
}

function RowBody({
  bookmark,
  collectionName,
  onEdit,
  onDelete,
  onToggleStar,
  onTagClick,
  onDomainClick,
  dragHandleProps,
  isDragging,
}: Omit<BookmarkRowProps, 'selectMode' | 'selected' | 'onToggleSelect' | 'sortable'> & {
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(28,27,25,.05)] transition-shadow duration-200 hover:border-line2 hover:shadow-[0_8px_24px_-12px_rgba(28,27,25,.18),0_2px_6px_rgba(28,27,25,.05)] ${
        isDragging ? 'z-10 opacity-60 shadow-xl ring-2 ring-accent/40' : ''
      }`}
    >
      <button
        type="button"
        aria-label="拖拽排序"
        title="拖拽排序"
        className="hidden h-7 w-4 shrink-0 cursor-grab touch-none items-center justify-center text-ink3 hover:text-ink active:cursor-grabbing lg:flex lg:opacity-0 lg:group-hover:opacity-100"
        {...dragHandleProps}
      >
        <GripVertical size={15} />
      </button>
      <Favicon domain={bookmark.domain} title={bookmark.title} faviconUrl={bookmark.faviconUrl} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer noopener"
            className="truncate text-[14px] font-semibold text-ink hover:text-accent"
            title={bookmark.title}
          >
            {bookmark.title}
          </a>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink3">
          <button
            onClick={() => onDomainClick?.(bookmark.domain)}
            className="truncate hover:text-accent"
            title={`筛选 ${bookmark.domain}`}
          >
            {bookmark.domain}
          </button>
          {collectionName && (
            <>
              <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#c9c5bc]" />
              <span className="shrink-0">{collectionName}</span>
            </>
          )}
        </div>
        {bookmark.description && (
          <p
            className="mt-0.5 truncate text-[12px] leading-5 text-ink3"
            title={bookmark.description}
          >
            {bookmark.description}
          </p>
        )}
      </div>

      {bookmark.tags.length > 0 && (
        <div className="flex max-w-[40%] shrink-0 flex-wrap items-center justify-end gap-1.5">
          {bookmark.tags.slice(0, 3).map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="rounded-md border border-line bg-canvas px-2 py-[2px] text-[11.5px] text-ink2 hover:border-accent/40 hover:text-accent"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <span className="hidden w-12 shrink-0 text-right text-[12px] tabular-nums text-ink3 sm:block">
        {shortDate(bookmark.createdAt)}
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        <StarButton
          starred={bookmark.starred}
          onToggle={() => onToggleStar(bookmark.id)}
          revealOnHover={!bookmark.starred}
        />
        <button
          onClick={() => onEdit(bookmark)}
          aria-label={`编辑 ${bookmark.title}`}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#a39f95] opacity-100 transition-opacity hover:bg-canvas hover:text-ink2 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(bookmark)}
          aria-label={`删除 ${bookmark.title}`}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#a39f95] opacity-100 transition-opacity hover:bg-danger/10 hover:text-danger lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function BookmarkRow(props: BookmarkRowProps) {
  const {
    bookmark,
    selectMode = false,
    selected = false,
    onToggleSelect,
    collectionName,
    sortable = false,
    ...rest
  } = props

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id,
    disabled: !sortable || selectMode,
  })

  if (selectMode) {
    return (
      <label
        ref={setNodeRef}
        className={`flex cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 py-2.5 transition-colors ${
          selected
            ? 'border-accent/50 bg-accent-soft/50'
            : 'border-line bg-surface hover:border-line2 hover:bg-surface-2'
        }`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect?.(bookmark.id)}
          className="h-4 w-4 shrink-0 accent-accent"
        />
        <Favicon domain={bookmark.domain} title={bookmark.title} faviconUrl={bookmark.faviconUrl} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-ink">{bookmark.title}</div>
          <div className="mt-0.5 truncate text-[12px] text-ink3">
            {bookmark.domain}
            {collectionName ? ` · ${collectionName}` : ''}
          </div>
        </div>
        {bookmark.starred && <Star size={13} className="shrink-0 fill-star text-star" />}
      </label>
    )
  }

  const style = sortable
    ? { transform: CSS.Transform.toString(transform), transition }
    : undefined

  return (
    <div ref={setNodeRef} style={style}>
      <RowBody
        bookmark={bookmark}
        collectionName={collectionName}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        {...rest}
      />
    </div>
  )
}
