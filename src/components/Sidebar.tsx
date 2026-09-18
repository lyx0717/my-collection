import type { ReactNode } from 'react'
import { Bookmark, Folder, Pencil, Plus, Star, Tag, HardDriveDownload, Trash2, X } from 'lucide-react'
import type { Collection } from '../types'
import type { Scope } from '../types'

interface SidebarProps {
  total: number
  starredCount: number
  collections: Collection[]
  collectionCounts: Map<string, number>
  tags: Array<[string, number]>
  scope: Scope
  activeTags: string[]
  onScope: (scope: Scope) => void
  onTag: (tag: string) => void
  onAddCollection: () => void
  onEditCollection: (col: Collection) => void
  onDeleteCollection: (col: Collection) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

function scopeIsActive(scope: Scope, target: Scope['type'], id?: string): boolean {
  if (scope.type !== target) return false
  return id === undefined || (scope.type === 'collection' && scope.id === id)
}

function NavRow({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-left text-[13.5px] font-medium transition-colors ${
        active
          ? 'bg-accent-soft font-semibold text-accent-ink'
          : 'text-ink2 hover:bg-surface-2'
      }`}
    >
      <span className={active ? 'text-accent' : 'text-ink3'}>{icon}</span>
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className={`ml-auto text-[11.5px] tabular-nums ${active ? 'text-accent' : 'text-ink3'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function SidebarBody(props: SidebarProps) {
  const {
    total,
    starredCount,
    collections,
    collectionCounts,
    tags,
    scope,
    activeTags,
    onScope,
    onTag,
    onAddCollection,
    onEditCollection,
    onDeleteCollection,
  } = props

  return (
    <div className="flex h-full flex-col gap-0.5 p-3">
      <div className="flex items-center gap-2.5 px-2 pb-3 pt-1.5">
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-accent shadow-[0_4px_10px_-3px_rgba(62,92,255,.5)]">
          <Bookmark size={15} className="text-white" fill="white" />
        </span>
        <div>
          <div className="text-[14.5px] font-bold leading-tight">我的书签</div>
          <div className="text-[10.5px] text-ink3">Bookmarks</div>
        </div>
      </div>

      <NavRow
        active={scopeIsActive(scope, 'all')}
        icon={<Bookmark size={16} strokeWidth={1.8} />}
        label="全部书签"
        count={total}
        onClick={() => onScope({ type: 'all' })}
      />
      <NavRow
        active={scopeIsActive(scope, 'starred')}
        icon={<Star size={16} strokeWidth={1.8} />}
        label="星标书签"
        count={starredCount}
        onClick={() => onScope({ type: 'starred' })}
      />

      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-4 text-[10.5px] font-semibold tracking-[0.14em] text-ink3">
        分组
        <button
          onClick={onAddCollection}
          aria-label="新建分组"
          className="flex h-5 w-5 items-center justify-center rounded text-ink3 hover:text-accent"
        >
          <Plus size={14} />
        </button>
      </div>
      {collections.map((col) => {
        const active = scopeIsActive(scope, 'collection', col.id)
        return (
          <div
            key={col.id}
            className={`group/col flex w-full items-center rounded-[10px] pl-2.5 pr-1 transition-colors ${
              active ? 'bg-accent-soft' : 'hover:bg-surface-2'
            }`}
          >
            <button
              onClick={() => onScope({ type: 'collection', id: col.id })}
              className="flex min-w-0 flex-1 items-center gap-2.5 py-[7px] text-left text-[13.5px] font-medium"
            >
              <Folder
                size={16}
                strokeWidth={1.7}
                className={`shrink-0 fill-current opacity-80 ${active ? 'text-accent' : 'text-ink3'}`}
              />
              <span className={`truncate ${active ? 'font-semibold text-accent-ink' : 'text-ink2'}`}>
                {col.emoji ? `${col.emoji} ${col.name}` : col.name}
              </span>
            </button>
            <span
              className={`shrink-0 text-[11.5px] tabular-nums transition-opacity group-hover/col:hidden ${
                active ? 'text-accent' : 'text-ink3'
              }`}
            >
              {collectionCounts.get(col.id) ?? 0}
            </span>
            <span className="flex w-0 shrink-0 items-center gap-0.5 overflow-hidden opacity-0 transition-all duration-150 group-hover/col:w-[52px] group-hover/col:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditCollection(col)
                }}
                aria-label={`编辑分组 ${col.name}`}
                className="flex h-6 w-6 items-center justify-center rounded-md text-ink3 hover:bg-canvas hover:text-ink"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteCollection(col)
                }}
                aria-label={`删除分组 ${col.name}`}
                className="flex h-6 w-6 items-center justify-center rounded-md text-ink3 hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={12} />
              </button>
            </span>
          </div>
        )
      })}
      <NavRow
        active={scopeIsActive(scope, 'none')}
        icon={<Folder size={16} strokeWidth={1.7} className="opacity-60" />}
        label="未分组"
        count={collectionCounts.get('__none__') ?? 0}
        onClick={() => onScope({ type: 'none' })}
      />

      <div className="px-2.5 pb-1.5 pt-4 text-[10.5px] font-semibold tracking-[0.14em] text-ink3">
        标签
      </div>
      <div className="flex-1 overflow-y-auto">
        {tags.length === 0 && <p className="px-2.5 text-[12px] text-ink3">还没有标签</p>}
        {tags.map(([tag, count]) => {
          const active = activeTags.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => onTag(tag)}
              className={`flex w-full items-center gap-2 rounded-[10px] px-2.5 py-[6px] text-left text-[13px] transition-colors ${
                active
                  ? 'bg-accent-soft font-semibold text-accent-ink'
                  : 'text-ink2 hover:bg-surface-2'
              }`}
            >
              <Tag size={13} strokeWidth={1.8} className={active ? 'text-accent' : 'text-ink3'} />
              <span className="truncate">{tag}</span>
              <span className={`ml-auto text-[11px] tabular-nums ${active ? 'text-accent' : 'text-ink3'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <a
        href="#/settings"
        className="mt-2 flex gap-2 rounded-[10px] bg-surface-2 p-2.5 text-[11px] leading-[1.55] text-ink3 transition-colors hover:text-ink2"
      >
        <HardDriveDownload size={14} className="mt-0.5 shrink-0" />
        数据仅保存在本浏览器，记得定期在设置页导出 JSON 备份
      </a>
    </div>
  )
}

export default function Sidebar(props: SidebarProps) {
  return (
    <>
      {/* 桌面常驻 */}
      <aside className="hidden w-[236px] shrink-0 border-r border-line bg-surface lg:block">
        <SidebarBody {...props} />
      </aside>

      {/* 手机抽屉 */}
      {props.mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-ink/35"
            onClick={props.onCloseMobile}
          />
          <aside className="animate-drawer absolute inset-y-0 left-0 w-[270px] border-r border-line bg-surface shadow-2xl">
            <button
              onClick={props.onCloseMobile}
              aria-label="关闭菜单"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-ink3 hover:bg-surface-2"
            >
              <X size={17} />
            </button>
            <SidebarBody {...props} />
          </aside>
        </div>
      )}
    </>
  )
}
