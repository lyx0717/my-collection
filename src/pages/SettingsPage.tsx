import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Bookmark,
  Cloud,
  Download,
  FileUp,
  Folder,
  HardDrive,
  Info,
  Pencil,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useBookmarks } from '../store/BookmarksContext'
import { useToast } from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import CollectionModal from '../components/CollectionModal'
import SyncPanel from '../components/settings/SyncPanel'
import Favicon from '../components/Favicon'
import { parseImportFile, type ParsedImport } from '../lib/importFile'
import { dedupeKey, extractDomain } from '../lib/url'
import { bookmarkletHref } from '../lib/bookmarklet'
import type { Collection, ParsedImportBookmark } from '../types'

type Section = 'sync' | 'data' | 'collections' | 'tags' | 'bookmarklet' | 'about'

interface PreviewEntry extends ParsedImportBookmark {
  key: string
  duplicate: boolean
  selected: boolean
  target: string // '' 未分组 | collectionId | '__new'
}

export default function SettingsPage() {
  const {
    bookmarks,
    collections,
    bulkAdd,
    addCollection,
    renameCollection,
    removeCollection,
    renameTag,
    removeTag,
    mergeCollections,
    downloadJson,
    downloadNetscape,
    resetToSeed,
    clearAll,
    storageBytes,
  } = useBookmarks()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [section, setSection] = useState<Section>('data')
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [preview, setPreview] = useState<PreviewEntry[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [confirm, setConfirm] = useState<
    | null
    | 'reset'
    | 'clear'
    | { collection: Collection }
    | { tag: string; count: number }
  >(null)
  const [collectionModal, setCollectionModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; collection: Collection }
    | null
  >(null)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [tagDraft, setTagDraft] = useState('')

  const existingKeys = useMemo(
    () => new Set(bookmarks.map((b) => dedupeKey(b.url))),
    [bookmarks],
  )

  const loadFile = async (file: File) => {
    setParsing(true)
    try {
      const result = await parseImportFile(file)
      if (result.bookmarks.length === 0) {
        toast('文件里没有识别到有效书签', 'err')
        return
      }
      setParsed(result)
      // 分组名 → 现有 id（含备份文件自带的分组定义）
      const incomingCols = result.collections ?? []
      const colByName = new Map(collections.map((c) => [c.name, c.id]))
      incomingCols.forEach((c) => {
        if (!colByName.has(c.name)) colByName.set(c.name, c.id)
      })
      const validIds = new Set([
        ...collections.map((c) => c.id),
        ...incomingCols.map((c) => c.id),
      ])
      setPreview(
        result.bookmarks.map((b) => {
          const key = dedupeKey(b.url)
          // 优先使用备份携带的分组 id；其次按文件夹名匹配；否则新建同名分组
          const target =
            b.collectionId && validIds.has(b.collectionId)
              ? b.collectionId
              : b.collectionName
                ? colByName.get(b.collectionName) ?? '__new'
                : ''
          return { ...b, key, duplicate: existingKeys.has(key), selected: !existingKeys.has(key), target }
        }),
      )
      toast(`识别到 ${result.bookmarks.length} 条书签（${result.format}）`)
    } catch (err) {
      toast(err instanceof Error ? err.message : '解析失败', 'err')
    } finally {
      setParsing(false)
    }
  }

  const folderOptions = useMemo(() => {
    const folders = new Set<string>()
    preview?.forEach((p) => p.collectionName && folders.add(p.collectionName))
    return [...folders]
  }, [preview])

  const setTargetForFolder = (folder: string, target: string) =>
    setPreview((prev) =>
      prev === null ? prev : prev.map((p) => (p.collectionName === folder ? { ...p, target } : p)),
    )

  const selectedCount = preview?.filter((p) => p.selected && !p.duplicate).length ?? 0
  const dupCount = preview?.filter((p) => p.duplicate).length ?? 0

  const confirmImport = () => {
    if (!preview) return
    // 先合入备份自带的分组（保留 id 与 emoji）
    if (parsed?.collections?.length) mergeCollections(parsed.collections)
    // 为「新建同名分组」创建分组
    const folderToCol = new Map<string, string>()
    for (const folder of folderOptions) {
      const target = preview.find((p) => p.collectionName === folder)?.target ?? ''
      if (target === '__new') {
        const created = addCollection(folder)
        folderToCol.set(folder, created.id)
      } else if (target) {
        folderToCol.set(folder, target)
      }
    }
    const drafts = preview
      .filter((p) => p.selected && !p.duplicate)
      .map((p) => ({
        url: p.url,
        title: p.title,
        description: p.description,
        collectionId:
          p.target && p.target !== '__new'
            ? p.target
            : p.collectionName
              ? folderToCol.get(p.collectionName)
              : undefined,
        tags: p.tags,
        createdAt: p.createdAt,
      }))
    bulkAdd(drafts)
    toast(`成功导入 ${drafts.length} 条书签`)
    setPreview(null)
    setParsed(null)
  }

  const tagStats = useMemo(() => {
    const counter = new Map<string, number>()
    for (const bm of bookmarks) for (const t of bm.tags) counter.set(t, (counter.get(t) ?? 0) + 1)
    return [...counter.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'),
    )
  }, [bookmarks])

  const submitCollection = (name: string, emoji?: string) => {
    if (collectionModal?.mode === 'edit') {
      renameCollection(collectionModal.collection.id, name, emoji)
      toast(`分组「${name}」已更新`)
    } else {
      addCollection(name, emoji)
      toast(`分组「${name}」已创建`)
    }
  }

  const saveTag = (oldName: string) => {
    const next = tagDraft.trim()
    if (!next) return
    if (next !== oldName && tagStats.some(([t]) => t === next)) {
      toast('已存在同名标签，将自动合并', 'err')
    }
    renameTag(oldName, next)
    setEditingTag(null)
  }

  const navItems: Array<{ key: Section; label: string; icon: ReactNode }> = [
    { key: 'sync', label: '云端同步', icon: <Cloud size={15} /> },
    { key: 'data', label: '数据导入导出', icon: <HardDrive size={15} /> },
    { key: 'collections', label: '分组管理', icon: <Folder size={15} /> },
    { key: 'tags', label: '标签管理', icon: <Tag size={15} /> },
    { key: 'bookmarklet', label: '书签小工具', icon: <Bookmark size={15} /> },
    { key: 'about', label: '关于', icon: <Info size={15} /> },
  ]

  const kb = (storageBytes / 1024).toFixed(1)

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 flex h-[62px] items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
        <a
          href="#/"
          className="flex h-9 items-center gap-1.5 rounded-[10px] px-2 text-[13px] text-ink2 hover:bg-surface-2"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">返回书签</span>
        </a>
        <h1 className="text-[16px] font-bold">设置</h1>
      </header>

      <div className="mx-auto flex max-w-5xl gap-8 px-4 py-8 sm:px-6">
        <nav className="hidden w-[168px] shrink-0 md:block">
          <div className="sticky top-24 flex flex-col gap-1">
            {navItems.map((n) => (
              <button
                key={n.key}
                onClick={() => {
                  setSection(n.key)
                  document.getElementById(`sec-${n.key}`)?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${
                  section === n.key
                    ? 'bg-accent-soft font-semibold text-accent-ink'
                    : 'text-ink2 hover:bg-surface-2'
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-10 pb-20">
          {/* ============ 云端同步 ============ */}
          <section id="sec-sync" className="scroll-mt-24">
            <SectionTitle
              title="云端同步"
              desc="配置 Cloudflare Worker 后，书签实时存到云端，多设备共享；断网时使用本地缓存。"
            />
            <SyncPanel />
          </section>

          {/* ============ 数据 ============ */}
          <section id="sec-data" className="scroll-mt-24">
            <SectionTitle title="数据导入导出" desc="所有书签保存在当前浏览器本地，建议每月导出一次 JSON 备份。" />
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) void loadFile(f)
                }}
                className={`rounded-[14px] border-[1.5px] border-dashed px-6 py-7 text-center transition-colors ${
                  dragging ? 'border-accent bg-accent-soft' : 'border-line2 bg-surface-2'
                }`}
              >
                <span className="mx-auto mb-3 flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-line bg-white text-accent">
                  {parsing ? (
                    <span className="h-[19px] w-[19px] animate-spin rounded-full border-2 border-line2 border-t-accent" />
                  ) : (
                    <Upload size={19} />
                  )}
                </span>
                <p className="text-[14px] font-semibold">
                  {parsing ? '正在解析文件…' : '拖入书签文件，或'}
                  {!parsing && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="ml-1 text-accent hover:underline"
                    >
                      点击选择
                    </button>
                  )}
                </p>
                <p className="mt-1 text-[12px] text-ink3">
                  支持 Chrome / Safari / Edge / Firefox 导出的 HTML、iTab 备份（.itabdata），以及 Raindrop / Linkding / 本站的 JSON、CSV
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".html,.htm,.json,.csv,.itabdata,text/html,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void loadFile(f)
                    e.target.value = ''
                  }}
                />
              </div>

              {/* 导入预览 */}
              {preview && (
                <div className="mt-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    <b className="text-[13.5px]">导入预览</b>
                    <span className="text-[11.5px] text-ink3">
                      {parsed?.format} · 共 {preview.length} 条
                    </span>
                    {dupCount > 0 && (
                      <span className="rounded-md bg-[#fbf1e2] px-2 py-0.5 text-[11.5px] text-[#b4681c]">
                        {dupCount} 条重复将跳过
                      </span>
                    )}
                    <span className="ml-auto text-[11.5px] text-ink3">
                      已选 {selectedCount} 条
                    </span>
                  </div>

                  {folderOptions.length > 0 && (
                    <div className="mb-3 space-y-2 rounded-xl border border-line bg-surface-2 p-3">
                      <p className="text-[11.5px] font-semibold text-ink3">原文件夹映射到分组</p>
                      {folderOptions.map((folder) => (
                        <div key={folder} className="flex items-center gap-3 text-[12.5px]">
                          <span className="w-32 truncate text-ink2">{folder}</span>
                          <select
                            value={preview.find((p) => p.collectionName === folder)?.target}
                            onChange={(e) => setTargetForFolder(folder, e.target.value)}
                            className="h-8 rounded-lg border border-line bg-white px-2 text-[12px] outline-none"
                          >
                            <option value="__new">新建分组「{folder}」</option>
                            {collections.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.emoji ? `${c.emoji} ` : ''}
                                {c.name}
                              </option>
                            ))}
                            <option value="">未分组</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
                    {preview.map((p, i) => (
                      <label
                        key={`${p.key}-${i}`}
                        className={`flex items-center gap-3 border-b border-line px-3 py-2 last:border-0 ${
                          p.duplicate ? 'bg-surface-2 text-ink3' : 'bg-white hover:bg-surface-2'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={p.duplicate ? false : p.selected}
                          disabled={p.duplicate}
                          onChange={(e) =>
                            setPreview((prev) =>
                              prev === null
                                ? prev
                                : prev.map((x, idx) =>
                                    idx === i ? { ...x, selected: e.target.checked } : x,
                                  ),
                            )
                          }
                          className="shrink-0 accent-accent"
                        />
                        <Favicon domain={extractDomain(p.url)} />
                        <span className="min-w-0 flex-1 truncate text-[13px]">{p.title}</span>
                        <span className="hidden max-w-[160px] truncate text-[11.5px] text-ink3 sm:block">
                          {extractDomain(p.url)}
                        </span>
                        {p.duplicate && (
                          <span className="shrink-0 text-[11px] text-[#b4681c]">已存在</span>
                        )}
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setPreview(null)
                        setParsed(null)
                      }}
                      className="h-9 rounded-[10px] border border-line2 px-4 text-[13px] font-medium text-ink2 hover:bg-surface-2"
                    >
                      取消
                    </button>
                    <button
                      onClick={confirmImport}
                      disabled={selectedCount === 0}
                      className="flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-white hover:bg-accent-ink disabled:opacity-40"
                    >
                      <FileUp size={14} />
                      导入 {selectedCount} 条
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <span className="text-[13px] font-semibold text-ink2">导出与备份</span>
                <div className="ml-auto flex gap-2.5">
                  <button
                    onClick={downloadJson}
                    className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3.5 text-[12.5px] font-medium text-ink2 hover:bg-surface-2"
                  >
                    <Download size={14} />
                    导出 JSON
                  </button>
                  <button
                    onClick={downloadNetscape}
                    className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3.5 text-[12.5px] font-medium text-ink2 hover:bg-surface-2"
                  >
                    <Download size={14} />
                    导出浏览器 HTML
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ============ 分组 ============ */}
          <section id="sec-collections" className="scroll-mt-24">
            <SectionTitle title="分组管理" desc="扁平一级分组；删除分组不会删除书签，它们会回到「未分组」。" />
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
                          onClick={() => setCollectionModal({ mode: 'edit', collection: col })}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink3 hover:bg-white hover:text-ink"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          aria-label={`删除分组 ${col.name}`}
                          onClick={() => setConfirm({ collection: col })}
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
                onClick={() => setCollectionModal({ mode: 'create' })}
                className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line2 text-[13px] font-medium text-ink2 hover:border-accent/50 hover:text-accent"
              >
                ＋ 新建分组
              </button>
            </div>
          </section>

          {/* ============ 标签 ============ */}
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
                          onClick={() => setConfirm({ tag, count })}
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

          {/* ============ 书签小工具 ============ */}
          <section id="sec-bookmarklet" className="scroll-mt-24">
            <SectionTitle title="书签小工具" desc="在任何网页点一下书签栏里的按钮，就能带着网址和标题一键收藏，无需安装扩展。" />
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
              <div className="flex flex-col items-center gap-3 rounded-[14px] bg-surface-2 px-6 py-7 text-center">
                <p className="text-[13px] text-ink2">把下面这个按钮拖到你的浏览器书签栏：</p>
                <a
                  href={bookmarkletHref()}
                  onClick={(e) => e.preventDefault()}
                  draggable
                  className="flex h-11 cursor-grab items-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(62,92,255,.55)] active:cursor-grabbing"
                >
                  <Bookmark size={15} fill="white" />
                  收藏到我的书签
                </a>
                <p className="text-[11.5px] text-ink3">
                  如果书签栏没显示：Chrome/Edge 按 ⌘/Ctrl+Shift+B；Safari 在「显示」菜单里开启
                </p>
              </div>
              <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-[12.5px] leading-6 text-ink2">
                <li>显示浏览器的书签栏；</li>
                <li>将上方按钮拖动到书签栏中（拖不动时，可在书签栏手动新建书签，名称随意，地址粘贴帮助文档里的代码）；</li>
                <li>以后浏览任何网页，点一下该书签，就会打开本站并自动填好网址与标题。</li>
              </ol>
            </div>
          </section>

          {/* ============ 关于 ============ */}
          <section id="sec-about" className="scroll-mt-24">
            <SectionTitle title="关于" desc="" />
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
              <dl className="grid grid-cols-2 gap-4 text-[13px] sm:grid-cols-3">
                <div>
                  <dt className="text-ink3">书签总数</dt>
                  <dd className="mt-1 text-[18px] font-bold tabular-nums">{bookmarks.length}</dd>
                </div>
                <div>
                  <dt className="text-ink3">分组数量</dt>
                  <dd className="mt-1 text-[18px] font-bold tabular-nums">{collections.length}</dd>
                </div>
                <div>
                  <dt className="text-ink3">本地占用</dt>
                  <dd className="mt-1 text-[18px] font-bold tabular-nums">{kb} KB</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2.5 border-t border-line pt-5">
                <button
                  onClick={() => setConfirm('reset')}
                  className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3.5 text-[12.5px] font-medium text-ink2 hover:bg-surface-2"
                >
                  恢复示例数据
                </button>
                <button
                  onClick={() => setConfirm('clear')}
                  className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3.5 text-[12.5px] font-medium text-ink2 hover:border-danger/40 hover:text-danger"
                >
                  清空全部数据
                </button>
              </div>
              <p className="mt-4 text-[11.5px] leading-5 text-ink3">
                数据键名 mybookmarks:v2，仅存于当前浏览器。清除浏览器站点数据前，请先导出 JSON。
              </p>
            </div>
          </section>
        </div>
      </div>

      {confirm === 'reset' && (
        <ConfirmDialog
          title="恢复为示例数据？"
          message="当前浏览器里的全部书签与分组将被 22 条示例书签覆盖。建议先导出 JSON 备份。"
          confirmText="恢复示例"
          danger
          onConfirm={() => {
            resetToSeed()
            setConfirm(null)
            toast('已恢复为示例数据')
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'clear' && (
        <ConfirmDialog
          title="清空全部数据？"
          message="所有书签和分组都会被删除，且无法撤销。建议先导出 JSON 备份。"
          confirmText="全部清空"
          danger
          onConfirm={() => {
            clearAll()
            setConfirm(null)
            toast('已清空全部数据')
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm && typeof confirm === 'object' && 'collection' in confirm && (
        <ConfirmDialog
          title={`删除分组「${confirm.collection.name}」？`}
          message="分组内的书签不会被删除，会移动到「未分组」。"
          confirmText="删除分组"
          danger
          onConfirm={() => {
            removeCollection(confirm.collection.id)
            setConfirm(null)
            toast(`分组「${confirm.collection.name}」已删除`)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm && typeof confirm === 'object' && 'tag' in confirm && (
        <ConfirmDialog
          title={`删除标签「#${confirm.tag}」？`}
          message={`该标签会从 ${confirm.count} 条书签上移除，书签本身不会被删除。`}
          confirmText="删除标签"
          danger
          onConfirm={() => {
            removeTag(confirm.tag)
            setConfirm(null)
            toast(`标签「#${confirm.tag}」已删除`)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {collectionModal && (
        <CollectionModal
          initial={collectionModal.mode === 'edit' ? collectionModal.collection : null}
          existingNames={collections.map((c) => c.name)}
          onSubmit={submitCollection}
          onClose={() => setCollectionModal(null)}
        />
      )}
    </div>
  )
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[20px] font-bold">{title}</h2>
      {desc && <p className="mt-1 text-[13px] text-ink3">{desc}</p>}
    </div>
  )
}
