import { useMemo, useRef, useState } from 'react'
import { Download, FileUp, Upload } from 'lucide-react'
import { useBookmarks } from '../../store/BookmarksContext'
import { useToast } from '../Toast'
import Favicon from '../Favicon'
import { parseImportFile, type ParsedImport } from '../../lib/importFile'
import { dedupeKey, extractDomain } from '../../lib/url'
import type { ParsedImportBookmark } from '../../types'
import SectionTitle from './SectionTitle'

interface PreviewEntry extends ParsedImportBookmark {
  key: string
  duplicate: boolean
  selected: boolean
  target: string
}

export default function DataSection() {
  const { bookmarks, collections, bulkAdd, addCollection, mergeCollections, downloadJson, downloadNetscape } =
    useBookmarks()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [preview, setPreview] = useState<PreviewEntry[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)

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
          const target =
            b.collectionId && validIds.has(b.collectionId)
              ? b.collectionId
              : b.collectionName
                ? colByName.get(b.collectionName) ?? '__new'
                : ''
          return {
            ...b,
            key,
            duplicate: existingKeys.has(key),
            selected: !existingKeys.has(key),
            target,
          }
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
    if (parsed?.collections?.length) mergeCollections(parsed.collections)
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

  return (
    <section id="sec-data" className="scroll-mt-24">
      <SectionTitle
        title="数据导入导出"
        desc="书签保存在当前浏览器本地。清缓存、换电脑前请先导出 JSON 备份。"
      />
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
            支持 Chrome / Safari / Edge / Firefox 导出的 HTML、iTab 备份（.itabdata），以及 Raindrop
            / Linkding / 本站的 JSON、CSV
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
              <span className="ml-auto text-[11.5px] text-ink3">已选 {selectedCount} 条</span>
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
  )
}
