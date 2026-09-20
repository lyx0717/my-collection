import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckSquare,
  Globe,
  LayoutGrid,
  List,
  LayoutDashboard,
  Loader2,
  Plus,
  Settings,
  Bookmark as BookmarkIcon,
  Upload,
  X,
} from 'lucide-react'
import { useBookmarks } from '../store/BookmarksContext'
import { useAppearance } from '../store/AppearanceContext'
import { useToast } from '../components/Toast'
import type { Bookmark, Scope, ViewMode } from '../types'
import { dedupeKey } from '../lib/url'
import { useBookmarkFilter } from '../hooks/useBookmarkFilter'
import { useBatchSelection } from '../hooks/useBatchSelection'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import BookmarkFilterInput from '../components/BookmarkFilterInput'
import BookmarkRow from '../components/BookmarkRow'
import BookmarkGridCard from '../components/BookmarkGridCard'
import BookmarkTile from '../components/BookmarkTile'
import BookmarkModal from '../components/BookmarkModal'
import BatchToolbar from '../components/BatchToolbar'
import DomainBatchBar from '../components/DomainBatchBar'
import SortableBookmarks from '../components/SortableBookmarks'
import CollectionModal from '../components/CollectionModal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import type { Collection } from '../types'

const VIEW_KEY = 'mybookmarks:view'

export default function HomePage() {
  const {
    bookmarks,
    collections,
    seedLoading,
    toggleStar,
    removeBookmark,
    addCollection,
    renameCollection,
    removeCollection,
    bulkUpdate,
    bulkAddTags,
    bulkRemove,
    removeTag,
    reorderBookmarks,
    reorderCollections,
  } = useBookmarks()
  const { glassMode } = useAppearance()
  const isGlass = glassMode === 'glass'
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [deleting, setDeleting] = useState<Bookmark | null>(null)
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)
  const [collectionModal, setCollectionModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; collection: Collection }
    | null
  >(null)
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null)

  const [modal, setModal] = useState<
    | { mode: 'add' }
    | { mode: 'edit'; bookmark: Bookmark }
    | { mode: 'preset'; url: string; title?: string; bookmarklet: boolean }
    | null
  >(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  const initialView = (): ViewMode => {
    const saved = localStorage.getItem(VIEW_KEY)
    return saved === 'grid' || saved === 'tile' ? saved : 'list'
  }
  const [view, setView] = useState<ViewMode>(initialView)

  const {
    query,
    scope,
    activeTags,
    domainFilter,
    visible,
    collectionMap,
    collectionCounts,
    allTags,
    contextTitle,
    hasActiveFilter,
    searchFiltered,
    starredCount,
  } = useBookmarkFilter(bookmarks, collections, params)

  const visibleIds = visible.map((b) => b.id)
  const {
    batchMode,
    selectedIds,
    allVisibleSelected,
    toggleSelect,
    toggleSelectAll,
    enterBatch,
    exitBatch,
  } = useBatchSelection(visibleIds)

  // 拖拽：全部/分组/星标/未分组可用；搜索与标签域名筛选、批量多选时禁用
  const dragEnabled = !batchMode && !searchFiltered

  const updateParams = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    mutate(next)
    setParams(next, { replace: false })
  }

  const setScope = (s: Scope) =>
    updateParams((p) => {
      p.delete('c')
      p.delete('star')
      p.delete('none')
      if (s.type === 'collection') p.set('c', s.id)
      if (s.type === 'starred') p.set('star', '1')
      if (s.type === 'none') p.set('none', '1')
    })

  const toggleTag = (tag: string) =>
    updateParams((p) => {
      const current = p.getAll('tag')
      p.delete('tag')
      const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
      next.forEach((t) => p.append('tag', t))
    })

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  // 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      const filter = document.getElementById('bookmark-filter-input')
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        filter?.focus()
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        filter?.focus()
      } else if (e.key === 'n') {
        e.preventDefault()
        setModal({ mode: 'add' })
      } else if (e.key === 'Escape' && query) {
        updateParams((p) => p.delete('q'))
        filter?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, params])

  const handleSubmitCollection = (name: string, emoji?: string) => {
    if (collectionModal?.mode === 'edit') {
      renameCollection(collectionModal.collection.id, name, emoji)
      toast(`分组「${name}」已更新`)
    } else {
      const created = addCollection(name, emoji)
      toast(`分组「${name}」已创建`)
      setScope({ type: 'collection', id: created.id })
      setMobileMenu(false)
    }
  }

  if (seedLoading) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas text-ink3">
        <Loader2 size={26} className="animate-spin text-accent" />
        <p className="text-[13px]">正在加载书签…</p>
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <Sidebar
        total={bookmarks.length}
        starredCount={starredCount}
        collections={collections}
        collectionCounts={collectionCounts}
        tags={allTags}
        scope={scope}
        activeTags={activeTags}
        onScope={(s) => {
          setScope(s)
          setMobileMenu(false)
        }}
        onTag={(t) => {
          toggleTag(t)
        }}
        onClearTags={() => updateParams((p) => p.delete('tag'))}
        onDeleteTag={(tag) => setDeletingTag(tag)}
        onAddCollection={() => setCollectionModal({ mode: 'create' })}
        onEditCollection={(col) => setCollectionModal({ mode: 'edit', collection: col })}
        onDeleteCollection={(col) => setDeletingCollection(col)}
        onReorderCollections={(orderedIds) => {
          reorderCollections(orderedIds)
          toast('分组顺序已更新')
        }}
        mobileOpen={mobileMenu}
        onCloseMobile={() => setMobileMenu(false)}
      />

      <div
        className={
          isGlass
            ? 'relative flex min-w-0 flex-1 flex-col overflow-hidden'
            : 'flex min-w-0 flex-1 flex-col'
        }
      >
        <Topbar
          onAdd={() => setModal({ mode: 'add' })}
          onOpenMenu={() => setMobileMenu(true)}
        />

        <main
          className={`flex-1 overflow-y-auto px-4 pb-28 sm:px-6 lg:pb-10 ${
            isGlass ? 'pt-0' : ''
          }`}
        >
          {/* 玻璃模式：顶栏为绝对定位，用垫片把分组条放到其下方，避免与 sticky 叠出空隙 */}
          {isGlass && <div aria-hidden className="h-[62px] shrink-0" />}

          {/* 手机分组 chips */}
          <div
            className={`flex gap-2 overflow-x-auto border-b border-line px-4 py-2.5 lg:hidden [mask-image:linear-gradient(to right,#000_calc(100%_-_18px),transparent)] ${
              isGlass
                ? 'glass-topbar-chips sticky top-[62px] z-30 -mx-4 bg-surface'
                : 'sticky top-0 z-30 -mx-4 bg-surface'
            }`}
          >
            {[
              { label: `全部 ${bookmarks.length}`, active: scope.type === 'all', onClick: () => setScope({ type: 'all' }) },
              { label: `★ 星标 ${starredCount}`, active: scope.type === 'starred', onClick: () => setScope({ type: 'starred' }) },
              ...collections.map((c) => ({
                label: `${c.emoji ?? ''} ${c.name} ${collectionCounts.get(c.id) ?? 0}`,
                active: scope.type === 'collection' && scope.id === c.id,
                onClick: () => setScope({ type: 'collection', id: c.id }),
              })),
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={chip.onClick}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  chip.active
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-white/80 text-ink2'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="mx-auto max-w-5xl py-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h1 className="text-[20px] font-bold">{contextTitle}</h1>
              <span className="text-[12.5px] text-ink3">
                {visible.length} 条
              </span>
              <BookmarkFilterInput
                value={query}
                count={visible.length}
                onChange={(q) => updateParams((p) => (q ? p.set('q', q) : p.delete('q')))}
              />
              <div className="ml-auto flex items-center gap-2.5">
                {view !== 'tile' && (
                <button
                  onClick={() => {
                    if (batchMode) exitBatch()
                    else {
                      enterBatch()
                      setView('list')
                    }
                  }}
                  className={`flex h-[34px] items-center gap-1.5 rounded-[10px] border px-2.5 text-[12.5px] font-medium transition-colors ${
                    batchMode
                      ? 'border-accent bg-accent-soft text-accent-ink'
                      : 'border-line bg-white text-ink2 hover:border-line2'
                  }`}
                >
                  <CheckSquare size={13} />
                  <span className="hidden sm:inline">{batchMode ? '退出多选' : '多选'}</span>
                  <span className="sm:hidden">{batchMode ? '退出' : '多选'}</span>
                </button>
                )}
                <div className="flex rounded-[10px] bg-[#efeeea] p-[3px]">
                  {(
                    [
                      ['list', List, '列表视图'],
                      ['grid', LayoutGrid, '网格视图'],
                      ['tile', LayoutDashboard, '磁贴视图'],
                    ] as const
                  ).map(([mode, Icon, label]) => (
                    <button
                      key={mode}
                      aria-label={label}
                      title={label}
                      onClick={() => setView(mode)}
                      className={`flex h-7 w-[30px] items-center justify-center rounded-[7px] transition-all ${
                        view === mode
                          ? 'bg-white text-ink shadow-[0_1px_3px_rgba(28,27,25,.12)]'
                          : 'text-[#8f8b82]'
                      }`}
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 激活的标签 / 域名筛选 */}
            {(activeTags.length > 0 || domainFilter) && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {activeTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className="flex items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-[12px] font-medium text-accent-ink hover:bg-accent/15"
                  >
                    #{t}
                    <X size={11} />
                  </button>
                ))}
                {domainFilter && (
                  <span className="flex items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-[12px] font-medium text-accent-ink">
                    <Globe size={11} />
                    {domainFilter}
                    <button
                      onClick={() => updateParams((p) => p.delete('d'))}
                      aria-label="移除域名筛选"
                      className="hover:text-danger"
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}
                <button
                  onClick={() =>
                    updateParams((p) => {
                      p.delete('tag')
                      p.delete('d')
                    })
                  }
                  className="text-[12px] text-ink3 underline-offset-2 hover:text-accent hover:underline"
                >
                  清除筛选
                </button>
              </div>
            )}

            {/* 域名批量归类横幅 */}
            {domainFilter && visible.length > 1 && !batchMode && (
              <DomainBatchBar
                domain={domainFilter}
                count={visible.length}
                collections={collections}
                onMove={(collectionId) => {
                  bulkUpdate(
                    visible.map((b) => b.id),
                    { collectionId },
                  )
                  toast(`已将 ${visible.length} 个 ${domainFilter} 书签移动分组`)
                }}
              />
            )}

            {/* 批量操作栏 */}
            {batchMode && (
              <BatchToolbar
                selectedCount={selectedIds.size}
                totalCount={visible.length}
                collections={collections}
                allSelected={allVisibleSelected}
                onSelectAll={toggleSelectAll}
                onClear={exitBatch}
                onMove={(collectionId) => {
                  bulkUpdate([...selectedIds], { collectionId })
                  exitBatch()
                }}
                onAddTags={(tags) => {
                  bulkAddTags([...selectedIds], tags)
                  exitBatch()
                }}
                onStar={() => {
                  bulkUpdate([...selectedIds], { starred: true })
                  exitBatch()
                }}
                onDelete={() => setBatchDeleteOpen(true)}
              />
            )}

            {visible.length === 0 ? (
              bookmarks.length === 0 ? (
                <EmptyState
                  title="还没有任何书签"
                  hint="把想留住的链接粘贴进来，标题、描述和图标会自动补全。也可以先从浏览器一键导入。"
                  action={
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => setModal({ mode: 'add' })}
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-semibold text-white hover:bg-accent-ink"
                      >
                        <Plus size={16} strokeWidth={2.4} />
                        添加第一个书签
                      </button>
                      <a
                        href="#/settings"
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-line2 bg-white px-5 text-[14px] font-medium text-ink2 hover:bg-surface-2"
                      >
                        <Upload size={15} />
                        导入浏览器书签
                      </a>
                    </div>
                  }
                />
              ) : (
                <EmptyState
                  title="没有匹配的书签"
                  hint="换个关键词，或清空当前的分组与标签筛选。"
                  action={
                    hasActiveFilter ? (
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={() =>
                            updateParams((p) => {
                              p.delete('q')
                              p.delete('tag')
                              p.delete('d')
                              p.delete('c')
                              p.delete('star')
                              p.delete('none')
                            })
                          }
                          className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-[13px] font-semibold text-white hover:bg-accent-ink"
                        >
                          清除筛选
                        </button>
                        <button
                          onClick={() => updateParams((p) => {
                            p.delete('q'); p.delete('tag'); p.delete('d'); p.delete('c'); p.delete('star'); p.delete('none')
                          })}
                          className="inline-flex h-10 items-center rounded-lg border border-line2 bg-white px-4 text-[13px] font-medium text-ink2 hover:bg-surface-2"
                        >
                          查看全部书签
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              )
            ) : (
              <SortableBookmarks
                ids={visibleIds}
                view={view}
                disabled={!dragEnabled}
                onReorder={(orderedIds) => reorderBookmarks(orderedIds)}
              >
                {view === 'list' ? (
                  <div className="flex flex-col gap-2">
                    {visible.map((bm) => (
                      <BookmarkRow
                        key={bm.id}
                        bookmark={bm}
                        sortable={dragEnabled}
                        collectionName={
                          bm.collectionId ? collectionMap.get(bm.collectionId)?.name : undefined
                        }
                        selectMode={batchMode}
                        selected={selectedIds.has(bm.id)}
                        onToggleSelect={toggleSelect}
                        onEdit={(b) => setModal({ mode: 'edit', bookmark: b })}
                        onDelete={(b) => setDeleting(b)}
                        onToggleStar={toggleStar}
                        onTagClick={toggleTag}
                        onDomainClick={(d) => updateParams((p) => p.set('d', d))}
                      />
                    ))}
                  </div>
                ) : view === 'tile' ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                    {visible.map((bm) => (
                      <BookmarkTile
                        key={bm.id}
                        bookmark={bm}
                        sortable={dragEnabled}
                        onOpen={(b) => window.open(b.url, '_blank', 'noopener,noreferrer')}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {visible.map((bm) => (
                      <BookmarkGridCard
                        key={bm.id}
                        bookmark={bm}
                        compact
                        sortable={dragEnabled}
                        onToggleStar={toggleStar}
                        onTagClick={toggleTag}
                        onOpen={(b) => window.open(b.url, '_blank', 'noopener,noreferrer')}
                        onEdit={(b) => setModal({ mode: 'edit', bookmark: b })}
                        onDelete={(b) => setDeleting(b)}
                      />
                    ))}
                  </div>
                )}
              </SortableBookmarks>
            )}
          </div>
        </main>

        {/* 手机底栏 */}
        <nav className="flex h-[64px] shrink-0 border-t border-line bg-surface/95 pb-2 backdrop-blur lg:hidden">
          <a
            href="#/"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-accent"
          >
            <BookmarkIcon size={20} strokeWidth={1.8} />
            书签
          </a>
          <a
            href="#/settings"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-ink3"
          >
            <Settings size={20} strokeWidth={1.8} />
            设置
          </a>
        </nav>
      </div>

      {modal?.mode === 'add' && (
        <BookmarkModal key="add" onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <BookmarkModal
          key={modal.bookmark.id}
          editing={modal.bookmark}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === 'preset' && (
        <BookmarkModal
          key={`preset-${dedupeKey(modal.url)}`}
          preset={{ url: modal.url, title: modal.title }}
          fromBookmarklet={modal.bookmarklet}
          onClose={() => setModal(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="删除这条书签？"
          message={`「${deleting.title}」将从书库中删除，此操作无法撤销。`}
          confirmText="删除"
          danger
          onConfirm={() => {
            removeBookmark(deleting.id)
            toast(`「${deleting.title}」已删除`)
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}

      {collectionModal && (
        <CollectionModal
          initial={collectionModal.mode === 'edit' ? collectionModal.collection : null}
          existingNames={collections.map((c) => c.name)}
          onSubmit={handleSubmitCollection}
          onClose={() => setCollectionModal(null)}
        />
      )}

      {batchDeleteOpen && (
        <ConfirmDialog
          title={`删除 ${selectedIds.size} 条书签？`}
          message="这些书签将从书库中删除，此操作无法撤销。"
          confirmText={`删除 ${selectedIds.size} 条`}
          danger
          onConfirm={() => {
            bulkRemove([...selectedIds])
            setBatchDeleteOpen(false)
            exitBatch()
            toast(`已删除 ${selectedIds.size} 条书签`)
          }}
          onCancel={() => setBatchDeleteOpen(false)}
        />
      )}

      {deletingTag && (
        <ConfirmDialog
          title={`删除标签「#${deletingTag}」？`}
          message={`该标签会从相关书签上移除（书签不会被删除）。当前共有 ${bookmarks.filter((b) => b.tags.includes(deletingTag)).length} 条书签使用它。`}
          confirmText="删除标签"
          danger
          onConfirm={() => {
            removeTag(deletingTag)
            if (activeTags.includes(deletingTag)) toggleTag(deletingTag)
            toast(`标签「#${deletingTag}」已删除`)
            setDeletingTag(null)
          }}
          onCancel={() => setDeletingTag(null)}
        />
      )}

      {deletingCollection && (
        <ConfirmDialog
          title={`删除分组「${deletingCollection.name}」？`}
          message="分组内的书签不会被删除，会移动到「未分组」。"
          confirmText="删除分组"
          danger
          onConfirm={() => {
            removeCollection(deletingCollection.id)
            toast(`分组「${deletingCollection.name}」已删除`)
            setDeletingCollection(null)
            if (
              scope.type === 'collection' &&
              scope.id === deletingCollection.id
            ) {
              setScope({ type: 'all' })
            }
          }}
          onCancel={() => setDeletingCollection(null)}
        />
      )}
    </div>
  )
}
