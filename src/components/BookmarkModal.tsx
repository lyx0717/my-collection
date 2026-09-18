import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import type { Bookmark } from '../types'
import { useBookmarks } from '../store/BookmarksContext'
import { useToast } from './Toast'
import { fetchMetadata } from '../lib/metadata'
import { extractDomain, isValidUrl, normalizeUrl } from '../lib/url'
import { parseTags, tagsToText } from '../lib/tags'
import Favicon from './Favicon'

interface BookmarkModalProps {
  editing?: Bookmark | null
  preset?: { url?: string; title?: string }
  fromBookmarklet?: boolean
  onClose: () => void
}

type FetchStatus = 'idle' | 'fetching' | 'fetched' | 'degraded'

export default function BookmarkModal({
  editing,
  preset,
  fromBookmarklet,
  onClose,
}: BookmarkModalProps) {
  const { collections, bookmarks, addBookmark, updateBookmark, addCollection, findDuplicate } =
    useBookmarks()
  const toast = useToast()

  const [url, setUrl] = useState(editing?.url ?? preset?.url ?? '')
  const [title, setTitle] = useState(editing?.title ?? preset?.title ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [tagsText, setTagsText] = useState(tagsToText(editing?.tags ?? []))
  const [collectionId, setCollectionId] = useState(editing?.collectionId ?? '')
  const [starred, setStarred] = useState(editing?.starred ?? false)
  const [faviconUrl, setFaviconUrl] = useState(editing?.faviconUrl)
  const [cover, setCover] = useState(editing?.cover)

  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [urlError, setUrlError] = useState('')
  const [forceSave, setForceSave] = useState(false)
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColEmoji, setNewColEmoji] = useState('')
  const [colError, setColError] = useState('')

  const fetchedFor = useRef<string>('')
  const titleTouched = useRef(Boolean(editing || preset?.title))
  const descTouched = useRef(Boolean(editing))
  const requestSeq = useRef(0)

  const domain = useMemo(() => extractDomain(url), [url])
  const duplicate = useMemo(
    () => (url ? findDuplicate(url, editing?.id) : undefined),
    [url, findDuplicate, editing?.id],
  )

  const runFetch = async (rawUrl: string) => {
    const target = normalizeUrl(rawUrl)
    if (!isValidUrl(target) || fetchedFor.current === target) return
    fetchedFor.current = target
    const seq = ++requestSeq.current
    setFetchStatus('fetching')
    try {
      const meta = await fetchMetadata(target)
      if (seq !== requestSeq.current) return
      if (meta.title && !titleTouched.current) setTitle(meta.title)
      if (meta.description && !descTouched.current) setDescription(meta.description)
      if (meta.cover) setCover(meta.cover)
      if (meta.favicon) setFaviconUrl(meta.favicon)
      setFetchStatus(meta.title || meta.description ? 'fetched' : 'degraded')
    } catch {
      if (seq !== requestSeq.current) return
      setFetchStatus('degraded')
    }
  }

  // 新建时若带了 URL（粘贴/书签小工具），自动抓取一次
  useEffect(() => {
    if (!editing && preset?.url) void runFetch(preset.url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const finalUrl = normalizeUrl(url)
    if (!isValidUrl(finalUrl)) {
      setUrlError('请输入以 http:// 或 https:// 开头的有效链接')
      return
    }
    if (duplicate && !forceSave) {
      setForceSave(true)
      return
    }

    // 输入了新分组名称但没点「创建」就直接保存：先建组再归属
    let finalCollectionId = collectionId
    if (creatingCollection) {
      const name = newColName.trim()
      if (name) {
        const existing = collections.find((c) => c.name === name)
        finalCollectionId = existing
          ? existing.id
          : addCollection(name, newColEmoji.trim() || undefined).id
      }
    }

    const payload = {
      url: finalUrl,
      title: title.trim() || domain,
      description: description.trim() || undefined,
      faviconUrl,
      cover,
      collectionId: finalCollectionId || undefined,
      tags: parseTags(tagsText),
      starred,
    }

    if (editing) {
      updateBookmark(editing.id, payload)
      toast(`已保存对「${payload.title}」的修改`)
    } else {
      addBookmark(payload)
      toast(`「${payload.title}」已收藏`)
    }
    onClose()
  }

  const enteredTags = parseTags(tagsText)
  const tagSuggestions = useMemo(() => {
    const counter = new Map<string, number>()
    for (const bm of bookmarks) for (const t of bm.tags) counter.set(t, (counter.get(t) ?? 0) + 1)
    return [...counter.entries()]
      .filter(([t]) => !enteredTags.includes(t))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
      .slice(0, 10)
      .map(([t]) => t)
  }, [bookmarks, enteredTags])

  const appendTag = (tag: string) => {
    const next = [...enteredTags, tag]
    setTagsText(tagsToText(next))
  }

  const createCollection = () => {
    const name = newColName.trim()
    if (!name) {
      setColError('请填写分组名称')
      return
    }
    if (collections.some((c) => c.name === name)) {
      setColError('已存在同名分组')
      return
    }
    const created = addCollection(name, newColEmoji.trim() || undefined)
    setCollectionId(created.id)
    setNewColName('')
    setNewColEmoji('')
    setColError('')
    setCreatingCollection(false)
  }

  const inputCls =
    'h-10 w-full rounded-[10px] border border-line bg-white px-3 text-[13.5px] text-ink outline-none transition-shadow placeholder:text-[#b5b1a8] focus:border-accent focus:shadow-[0_0_0_3px_rgba(62,92,255,.12)]'
  const labelCls = 'mb-1.5 block text-[12px] font-semibold text-ink2'

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[65] flex items-end justify-center bg-ink/40 backdrop-blur-[3px] sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={editing ? '编辑书签' : '添加书签'}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop flex max-h-[94dvh] w-full max-w-[440px] flex-col overflow-y-auto rounded-t-[18px] bg-white shadow-[0_24px_60px_-20px_rgba(28,27,25,.35)] sm:rounded-[18px]"
      >
        <div className="flex items-start justify-between px-[22px] pt-5">
          <div>
            <h2 className="text-[17px] font-bold">{editing ? '编辑书签' : '添加书签'}</h2>
            <p className="mt-0.5 text-[12px] text-ink3">
              {editing ? '修改这条书签的信息' : '粘贴链接，自动补全网站信息'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-ink3 hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3.5 px-[22px] py-4">
          {fromBookmarklet && !editing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
              <Sparkles size={12} />
              来自书签小工具
            </span>
          )}

          <div>
            <label className={labelCls} htmlFor="bm-url">
              网址
            </label>
            <div className="relative">
              {domain && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2">
                  <Favicon domain={domain} faviconUrl={faviconUrl} size="sm" />
                </span>
              )}
              <input
                id="bm-url"
                className={`${inputCls} ${domain ? 'pl-10' : ''} ${urlError ? 'border-danger' : ''}`}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setUrlError('')
                  setForceSave(false)
                }}
                onBlur={(e) => {
                  const n = normalizeUrl(e.target.value)
                  if (n !== e.target.value) setUrl(n)
                  if (!editing && isValidUrl(n)) void runFetch(n)
                }}
                placeholder="https://example.com"
                inputMode="url"
                autoFocus={!preset?.url}
              />
            </div>
            {urlError && <p className="mt-1.5 text-[12px] text-danger">{urlError}</p>}
          </div>

          {fetchStatus === 'fetching' && (
            <div className="flex items-center gap-2.5 rounded-[11px] border border-dashed border-line2 bg-surface-2 px-3.5 py-3 text-[12.5px] text-ink2">
              <Loader2 size={15} className="animate-spin text-accent" />
              正在获取网站标题、描述与封面…
            </div>
          )}
          {fetchStatus === 'fetched' && (
            <div className="flex items-start gap-2.5 rounded-[11px] border border-[#d9ecdf] bg-[#f4faf6] px-3.5 py-2.5">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />
              <div>
                <b className="text-[12.5px] text-[#1e7c47]">已自动获取网站信息</b>
                <p className="text-[11.5px] text-[#4f8a66]">标题、描述与图标均可手动修改</p>
              </div>
            </div>
          )}
          {fetchStatus === 'degraded' && (
            <div className="flex items-start gap-2.5 rounded-[11px] border border-line2 bg-surface-2 px-3.5 py-2.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-ink3" />
              <p className="text-[12px] leading-5 text-ink2">
                暂时无法自动获取（每日免费额度有限或网络不通），请手动填写标题，保存不受影响。
              </p>
            </div>
          )}

          {duplicate && !forceSave && (
            <div className="flex items-start gap-2.5 rounded-[11px] border border-[#f0d9b5] bg-[#fdf6ea] px-3.5 py-2.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#b4681c]" />
              <div className="text-[12px] leading-5 text-[#8a5a1e]">
                已收藏过相同链接：「{duplicate.title}」
                <button
                  type="button"
                  onClick={() => setForceSave(true)}
                  className="ml-1 font-semibold underline underline-offset-2 hover:text-[#6d4516]"
                >
                  仍然保存
                </button>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="bm-title">
              标题
            </label>
            <input
              id="bm-title"
              className={inputCls}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                titleTouched.current = true
              }}
              placeholder="抓取后自动填入，也可手动填写"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="bm-desc">
              描述 / 备注
            </label>
            <textarea
              id="bm-desc"
              rows={2}
              className="w-full resize-y rounded-[10px] border border-line bg-white px-3 py-2.5 text-[13px] leading-6 outline-none transition-shadow placeholder:text-[#b5b1a8] focus:border-accent focus:shadow-[0_0_0_3px_rgba(62,92,255,.12)]"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                descTouched.current = true
              }}
              placeholder="网页简介或你的备注"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="bm-col">
              分组
            </label>
            {creatingCollection ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newColEmoji}
                  onChange={(e) => setNewColEmoji(e.target.value)}
                  maxLength={4}
                  placeholder="emoji"
                  className={`${inputCls} w-20 shrink-0 text-center`}
                />
                <input
                  value={newColName}
                  onChange={(e) => {
                    setNewColName(e.target.value)
                    setColError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createCollection())}
                  placeholder="新分组名称"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={createCollection}
                  className="h-10 shrink-0 rounded-[10px] bg-accent px-3 text-[12.5px] font-semibold text-white hover:bg-accent-ink"
                >
                  创建
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingCollection(false)
                    setColError('')
                  }}
                  aria-label="取消新建分组"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-line2 text-ink3 hover:bg-surface-2"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <select
                id="bm-col"
                className={`${inputCls} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23928E86%22 stroke-width=%222.4%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-8`}
                value={collectionId || '__none__'}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setCreatingCollection(true)
                  } else {
                    setCollectionId(e.target.value === '__none__' ? '' : e.target.value)
                  }
                }}
              >
                <option value="__none__">未分组</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji ? `${c.emoji} ` : ''}
                    {c.name}
                  </option>
                ))}
                <option value="__new__">＋ 新建分组…</option>
              </select>
            )}
            {colError && <p className="mt-1.5 text-[12px] text-danger">{colError}</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="bm-tags">
              标签
            </label>
            <input
              id="bm-tags"
              className={inputCls}
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="用逗号分隔，如：前端， 工具"
            />
            {tagSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tagSuggestions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => appendTag(t)}
                    className="flex items-center gap-0.5 rounded-md border border-line bg-canvas px-2 py-[3px] text-[11.5px] text-ink2 hover:border-accent/40 hover:text-accent"
                  >
                    <Plus size={10} />
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line px-[22px] py-3.5">
          <button
            type="button"
            onClick={() => setStarred((s) => !s)}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors ${
              starred ? 'text-star' : 'text-ink3 hover:bg-surface-2'
            }`}
          >
            <Star size={15} className={starred ? 'fill-star' : undefined} />
            {starred ? '已星标' : '加星标'}
          </button>
          <div className="flex items-center gap-2.5">
            {url && (
              <a
                href={normalizeUrl(url)}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-ink3 hover:text-accent"
              >
                <ExternalLink size={13} />
                预览
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-[10px] border border-line2 px-4 text-[13px] font-medium text-ink2 hover:bg-surface-2"
            >
              取消
            </button>
            <button
              type="submit"
              className="h-9 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-ink disabled:opacity-50"
            >
              {editing ? '保存修改' : duplicate && !forceSave ? '仍要保存' : '保存书签'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
