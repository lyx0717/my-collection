import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import {
  CheckSquare,
  Globe,
  LayoutGrid,
  List,
  LayoutDashboard,
  Loader2,
  Plus,
  Upload,
  X,
} from 'lucide-react'
import { useBookmarks } from '../store/BookmarksContext'
import { useToast } from '../components/Toast'
import type { Bookmark, Scope, ViewMode } from '../types'
import { dedupeKey } from '../lib/url'
import { itemEnter, viewContainer } from '../lib/motion'
import { useBookmarkFilter } from '../hooks/useBookmarkFilter'
import { useBatchSelection } from '../hooks/useBatchSelection'
import DockBar from '../components/DockBar'
import GroupNav from '../components/GroupNav'
import BookmarkFilterInput from '../components/BookmarkFilterInput'
import BookmarkRow from '../components/BookmarkRow'
import BookmarkGridCard from '../components/BookmarkGridCard'
import BookmarkTile from '../components/BookmarkTile'
import Favicon from '../components/Favicon'
import CountUp from '../components/CountUp'
import BookmarkModal from '../components/BookmarkModal'
import BatchToolbar from '../components/BatchToolbar'
import DomainBatchBar from '../components/DomainBatchBar'
import SortableBookmarks from '../components/SortableBookmarks'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'

const VIEW_KEY = 'mybookmarks:view'

export default function HomePage() {
  const { bookmarks, collections, seedLoading, removeBookmark, bulkUpdate, bulkRemove, reorderBookmarks } =
    useBookmarks()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [deleting, setDeleting] = useState<Bookmark | null>(null)
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)

  const [modal, setModal] = useState<
    | { mode: 'add' }
    | { mode: 'edit'; bookmark: Bookmark }
    | { mode: 'preset'; url: string; title?: string; bookmarklet: boolean }
    | null
  >(null)

  // 默认网格视图：书签库以「扫」为主，网格一屏能看的信息量远高于列表。
  // 老用户 localStorage 里已有的选择仍然优先，不强制改回来。
  const initialView = (): ViewMode => {
    const saved = localStorage.getItem(VIEW_KEY)
    return saved === 'list' || saved === 'tile' ? saved : 'grid'
  }
  const [view, setView] = useState<ViewMode>(initialView)

  const {
    query,
    scope,
    domainFilter,
    visible,
    collectionMap,
    collectionCounts,
    contextTitle,
    hasActiveFilter,
    searchFiltered,
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

  // 拖拽：全部/分组可用；搜索与域名筛选、批量多选时禁用
  const dragEnabled = !batchMode && !searchFiltered

  const updateParams = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    mutate(next)
    setParams(next, { replace: false })
  }

  const setScope = (s: Scope) =>
    updateParams((p) => {
      p.delete('c')
      if (s.type === 'collection') p.set('c', s.id)
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

  if (seedLoading) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas text-ink3">
        <Loader2 size={26} className="animate-spin text-accent" />
        <p className="text-[13px]">正在加载书签…</p>
      </div>
    )
  }

  return (
    // 容器不能带 bg-canvas：不透明底色会盖住 body 的玻璃底料，
    // 玻璃背后就没有内容可折射，透出来的只剩一片死白。底色由 body 负责。
    <div className="min-h-dvh">
      {/* 顶部通栏（fixed，通栏贴边） */}
      <DockBar />

      {/* DockBar 是 fixed，不占文档流。必须先垫一段与它等高的空白，
          否则 sticky 导航会紧贴视口顶（top:0 基准），整体上移 56px。 */}
      <div aria-hidden className="h-14" />

      {/* 分组导航：sticky 吸在通栏顶栏下方，滚动时始终可见。
          top-14 必须等于 DockBar 的固定高度（h-14 = 56px），
          否则胶囊与顶栏之间会露出一条缝隙。
          只做点击切换，增删改与排序都在设置页。

          pointer-events-none + 内层 auto：这条 sticky 带是**通栏**的
          （占满视口宽），而胶囊只有 ~700px 居中，两侧空出来的部分
          同样会参与命中测试 —— 滚动时从胶囊下方掠过的卡片会被它吃掉点击，
          表现就是「导航栏左右两侧的内容点不动」。
          让容器整体穿透、只把胶囊本身恢复可点，点击区域就精确等于可见胶囊。 */}
      <div className="pointer-events-none sticky top-14 z-30 px-4 py-3 sm:px-6">
        <GroupNav
          total={bookmarks.length}
          collections={collections}
          collectionCounts={collectionCounts}
          scope={scope}
          onScope={setScope}
        />
      </div>

      {/* pt-6：与吸顶胶囊保持舒适间距（胶囊自身 py-3 已占 12px） */}
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-[-0.01em]">{contextTitle}</h1>
            <span className="text-[12.5px] text-ink3">
              {/* digits 传书签总数：筛选时计数在 0~总数之间跳，
                  按总数预留位数，99→100 这类进位也不会撑宽容器。 */}
              <CountUp value={visible.length} digits={String(bookmarks.length).length} /> 条
            </span>
              <BookmarkFilterInput
                value={query}
                count={visible.length}
                onChange={(q) => updateParams((p) => (q ? p.set('q', q) : p.delete('q')))}
              />
              {/* 操作组：添加 / 多选 / 视图切换。
                  「添加书签」原先在顶栏，但用户想加书签时视线在卡片区，
                  按钮却要移到屏幕最上方 —— 移到内容工具条，与多选、视图切换同组。 */}
              <div className="ml-auto flex items-center gap-2.5">
                <button
                  onClick={() => setModal({ mode: 'add' })}
                  className="flex h-[34px] items-center gap-1.5 rounded-[12px] bg-accent px-3 text-[12.5px] font-semibold text-white shadow-[0_4px_12px_-5px_var(--accent-shadow)] transition-colors hover:bg-accent-ink"
                >
                  <Plus size={14} strokeWidth={2.4} />
                  <span className="hidden sm:inline">添加书签</span>
                </button>
                {/* 多选仅列表视图开放：网格/磁贴的卡片上没有复选框锚点，
                    强塞多选会逼出新的交互形态；列表行天然一行一项，
                    复选框位置稳定。进入多选也就不再需要 setView('list')——
                    按钮本身只在列表视图渲染，进来时已经在列表里。 */}
                {view === 'list' && (
                <button
                  onClick={() => (batchMode ? exitBatch() : enterBatch())}
                  className={`flex h-[34px] items-center gap-1.5 rounded-[10px] border px-2.5 text-[12.5px] font-medium transition-colors ${
                    batchMode
                      ? 'border-accent bg-accent-soft text-accent-ink'
                      : 'border-line bg-surface text-ink2 hover:border-line2'
                  }`}
                >
                  <CheckSquare size={13} />
                  <span className="hidden sm:inline">{batchMode ? '退出多选' : '多选'}</span>
                  <span className="sm:hidden">{batchMode ? '退出' : '多选'}</span>
                </button>
                )}
                {/* 多选期间锁定：选中集是按「当前可见列表」建立的，
                    切走视图（尤其切到磁贴/网格）等于换了一批条目，
                    已勾选的 id 会与展示内容对不上，产生「看不见却仍在选中集」
                    的错觉操作。所以多选时整组禁用，退出多选自动恢复。 */}
                <div
                  className={`flex rounded-[10px] bg-segment p-[3px] transition-opacity ${
                    batchMode ? 'pointer-events-none opacity-40' : ''
                  }`}
                  aria-disabled={batchMode}
                >
                  {(
                    [
                      // 顺序 = 使用频次：网格（默认）→ 磁贴 → 列表。
                      // 列表放最后：它是备选形态，需要时才切过去；
                      // 排在默认视图前面，会让最高频的那颗反而不显眼。
                      ['grid', LayoutGrid, '网格视图'],
                      ['tile', LayoutDashboard, '磁贴视图'],
                      ['list', List, '列表视图'],
                    ] as const
                  ).map(([mode, Icon, label]) => (
                    <button
                      key={mode}
                      aria-label={label}
                      title={batchMode ? '多选模式下不可切换视图' : label}
                      onClick={() => setView(mode)}
                      className={`relative flex h-7 w-[30px] items-center justify-center rounded-[7px] ${
                        view === mode ? 'text-ink' : 'text-ink4'
                      }`}
                    >
                      {view === mode && (
                        <m.span
                          layoutId="view-pill"
                          className="absolute inset-0 rounded-[7px] bg-surface shadow-[0_1px_3px_rgba(30,40,60,.12)]"
                          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
                        />
                      )}
                      <Icon size={15} className="relative z-10" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 激活的域名筛选 */}
            {domainFilter && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
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
                  onClick={() => updateParams((p) => p.delete('d'))}
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
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-line2 bg-surface px-5 text-[14px] font-medium text-ink2 hover:bg-surface-2"
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
                          className="inline-flex h-10 items-center rounded-lg border border-line2 bg-surface px-4 text-[13px] font-medium text-ink2 hover:bg-surface-2"
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
                renderOverlay={(id) => {
                  const bm = visible.find((b) => b.id === id)
                  if (!bm) return null
                  return (
                    <div className="pointer-events-none flex items-center gap-2.5 rounded-[20px] border border-line2 bg-surface px-3.5 py-2.5 shadow-xl">
                      <Favicon domain={bm.domain} faviconUrl={bm.faviconUrl} size="sm" />
                      <span className="max-w-[220px] truncate text-[13.5px] font-medium text-ink">
                        {bm.title}
                      </span>
                    </div>
                  )
                }}
              >
                {/* 三视图共用一份 map：容器做切换过渡，包裹层做错峰进场（内层留给 dnd-kit） */}
                <AnimatePresence mode="popLayout">
                  <m.div
                    key={view}
                    variants={viewContainer}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className={
                      view === 'list'
                        ? 'flex flex-col gap-2'
                        : view === 'tile'
                          ? 'grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7'
                          : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                    }
                  >
                    {visible.map((bm, i) => (
                      <m.div
                        key={bm.id}
                        custom={i}
                        variants={itemEnter}
                        className={view === 'list' ? undefined : 'h-full'}
                      >
                        {view === 'list' ? (
                          <BookmarkRow
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
                            onDomainClick={(d) => updateParams((p) => p.set('d', d))}
                          />
                        ) : view === 'tile' ? (
                          <BookmarkTile
                            bookmark={bm}
                            sortable={dragEnabled}
                            onOpen={(b) => window.open(b.url, '_blank', 'noopener,noreferrer')}
                          />
                        ) : (
                          <BookmarkGridCard
                            bookmark={bm}
                            compact
                            sortable={dragEnabled}
                            onOpen={(b) => window.open(b.url, '_blank', 'noopener,noreferrer')}
                            onEdit={(b) => setModal({ mode: 'edit', bookmark: b })}
                            onDelete={(b) => setDeleting(b)}
                          />
                        )}
                      </m.div>
                    ))}
                  </m.div>
                </AnimatePresence>
              </SortableBookmarks>
            )}
      </main>

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
    </div>
  )
}
