import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDownWideNarrow,
  CheckSquare,
  Globe,
  LayoutGrid,
  List,
  Plus,
  Settings,
  Bookmark as BookmarkIcon,
  Upload,
  X,
} from 'lucide-react'
import { useBookmarks } from '../store/BookmarksContext'
import { useToast } from '../components/Toast'
import type { Bookmark, Scope, SortMode, ViewMode } from '../types'
import { dedupeKey } from '../lib/url'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import BookmarkFilterInput from '../components/BookmarkFilterInput'
import BookmarkRow from '../components/BookmarkRow'
import BookmarkGridCard from '../components/BookmarkGridCard'
import BookmarkModal from '../components/BookmarkModal'
import BatchToolbar from '../components/BatchToolbar'
import DomainBatchBar from '../components/DomainBatchBar'
import CollectionModal from '../components/CollectionModal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import type { Collection } from '../types'

const VIEW_KEY = 'mybookmarks:view'

function scopeFromParams(p: URLSearchParams): Scope {
  const col = p.get('c')
  if (col) return { type: 'collection', id: col }
  if (p.get('star') === '1') return { type: 'starred' }
  if (p.get('none') === '1') return { type: 'none' }
  return { type: 'all' }
}

export default function HomePage() {
  const {
    bookmarks,
    collections,
    status,
    toggleStar,
    removeBookmark,
    addCollection,
    renameCollection,
    removeCollection,
    bulkUpdate,
    bulkAddTags,
    bulkRemove,
  } = useBookmarks()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [deleting, setDeleting] = useState<Bookmark | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
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

  const initialView = (): ViewMode =>
    localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'
  const [view, setView] = useState<ViewMode>(initialView)

  const query = params.get('q') ?? ''
  const scope = scopeFromParams(params)
  const activeTags = params.getAll('tag')
  const domainFilter = params.get('d') ?? ''
  const sort = (params.get('sort') as SortMode) ?? 'desc'

  const collectionMap = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections],
  )

  const collectionCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const bm of bookmarks) {
      const key = bm.collectionId ?? '__none__'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [bookmarks])

  const allTags = useMemo(() => {
    const counter = new Map<string, number>()
    for (const bm of bookmarks) for (const t of bm.tags) counter.set(t, (counter.get(t) ?? 0) + 1)
    return [...counter.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'),
    )
  }, [bookmarks])

  const visible = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const result = bookmarks.filter((bm) => {
      if (scope.type === 'starred' && !bm.starred) return false
      if (scope.type === 'none' && bm.collectionId) return false
      if (scope.type === 'collection' && bm.collectionId !== scope.id) return false
      if (domainFilter && bm.domain !== domainFilter) return false
      if (activeTags.length && !activeTags.every((t) => bm.tags.includes(t))) return false
      if (words.length) {
        const hay = [bm.title, bm.domain, bm.description ?? '', bm.tags.join(' '), bm.url]
          .join('\n')
          .toLowerCase()
        if (!words.every((w) => hay.includes(w))) return false
      }
      return true
    })
    result.sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title, 'zh')
      return sort === 'asc'
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt)
    })
    return result
  }, [bookmarks, scope, activeTags, query, domainFilter, sort])

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

  const contextTitle = useMemo(() => {
    if (scope.type === 'starred') return '星标书签'
    if (scope.type === 'none') return '未分组'
    if (scope.type === 'collection')
      return collectionMap.get(scope.id)?.name ?? '未知分组'
    return '全部书签'
  }, [scope, collectionMap])

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

  const hasActiveFilter = Boolean(query || activeTags.length || domainFilter) || scope.type !== 'all'

  // —— 批量操作 ——
  const visibleIds = visible.map((b) => b.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const exitBatch = () => {
    setBatchMode(false)
    setSelectedIds(new Set())
  }

  // 切换筛选/视图时，已选项中不在当前结果里的剔除
  useEffect(() => {
    if (!batchMode) return
    const visibleSet = new Set(visibleIds)
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleSet.has(id)))
      return next.size === prev.size ? prev : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, view, batchMode])

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <Sidebar
        total={bookmarks.length}
        starredCount={bookmarks.filter((b) => b.starred).length}
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
        onAddCollection={() => setCollectionModal({ mode: 'create' })}
        onEditCollection={(col) => setCollectionModal({ mode: 'edit', collection: col })}
        onDeleteCollection={(col) => setDeletingCollection(col)}
        cloudOn={status !== 'local' && status !== 'loading'}
        syncing={status === 'syncing'}
        offline={status === 'offline'}
        mobileOpen={mobileMenu}
        onCloseMobile={() => setMobileMenu(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onAdd={() => setModal({ mode: 'add' })}
          onOpenMenu={() => setMobileMenu(true)}
        />

        {/* 手机分组 chips */}
        <div className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto border-b border-line bg-surface px-4 py-2.5 lg:hidden [mask-image:linear-gradient(to right,#000_calc(100%_-_18px),transparent)]">
          {[
            { label: `全部 ${bookmarks.length}`, active: scope.type === 'all', onClick: () => setScope({ type: 'all' }) },
            { label: `★ 星标 ${bookmarks.filter((b) => b.starred).length}`, active: scope.type === 'starred', onClick: () => setScope({ type: 'starred' }) },
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
                  : 'border-line bg-white text-ink2'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto px-4 pb-28 sm:px-6 lg:pb-10">
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
                <button
                  onClick={() => {
                    setBatchMode((v) => !v)
                    setSelectedIds(new Set())
                    if (!batchMode) setView('list')
                  }}
                  className={`flex h-[34px] items-center gap-1.5 rounded-[10px] border px-2.5 text-[12.5px] font-medium transition-colors ${
                    batchMode
                      ? 'border-accent bg-accent-soft text-accent-ink'
                      : 'border-line bg-white text-ink2 hover:border-line2'
                  }`}
                >
                  <CheckSquare size={13} />
                  <span className="hidden sm:inline">{batchMode ? '退出多选' : '多选'}</span>
                </button>
                <div className="flex rounded-[10px] bg-[#efeeea] p-[3px]">
                  <button
                    aria-label="列表视图"
                    onClick={() => setView('list')}
                    className={`flex h-7 w-[30px] items-center justify-center rounded-[7px] transition-all ${
                      view === 'list' ? 'bg-white text-ink shadow-[0_1px_3px_rgba(28,27,25,.12)]' : 'text-[#8f8b82]'
                    }`}
                  >
                    <List size={15} />
                  </button>
                  <button
                    aria-label="网格视图"
                    onClick={() => setView('grid')}
                    className={`flex h-7 w-[30px] items-center justify-center rounded-[7px] transition-all ${
                      view === 'grid' ? 'bg-white text-ink shadow-[0_1px_3px_rgba(28,27,25,.12)]' : 'text-[#8f8b82]'
                    }`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) =>
                      updateParams((p) => p.set('sort', e.target.value))
                    }
                    aria-label="排序方式"
                    className="h-[34px] appearance-none rounded-[10px] border border-line bg-white pl-3 pr-8 text-[12.5px] text-ink2 outline-none"
                  >
                    <option value="desc">最新收录</option>
                    <option value="asc">最早收录</option>
                    <option value="az">标题 A→Z</option>
                  </select>
                  <ArrowDownWideNarrow
                    size={13}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink3"
                  />
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
                onSelectAll={() =>
                  setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds))
                }
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
            ) : view === 'list' ? (
              <div className="flex flex-col gap-2">
                {visible.map((bm) => (
                  <BookmarkRow
                    key={bm.id}
                    bookmark={bm}
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
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map((bm) => (
                  <BookmarkGridCard
                    key={bm.id}
                    bookmark={bm}
                    onToggleStar={toggleStar}
                    onTagClick={toggleTag}
                    onOpen={(b) => window.open(b.url, '_blank', 'noopener,noreferrer')}
                    onEdit={(b) => setModal({ mode: 'edit', bookmark: b })}
                    onDelete={(b) => setDeleting(b)}
                  />
                ))}
              </div>
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
          message="这些书签将从书库和云端删除，此操作无法撤销。"
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
