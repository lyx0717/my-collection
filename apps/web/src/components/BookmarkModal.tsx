import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import type { Bookmark } from '../types'
import { useBookmarks } from '../store/BookmarksContext'
import { useToast } from './Toast'
import { fetchMetadata } from '../lib/metadata'
import { ApiError } from '../lib/api'
import { extractDomain, isValidUrl, normalizeUrl } from '../lib/url'
import Favicon from './Favicon'

interface BookmarkModalProps {
  editing?: Bookmark | null
  preset?: { url?: string; title?: string }
  fromBookmarklet?: boolean
  /** 撞到重复链接时的出路：交回上层去打开那条书签的编辑弹窗 */
  onEditDuplicate?: (bookmark: Bookmark) => void
  onClose: () => void
}

type FetchStatus = 'idle' | 'fetching' | 'fetched' | 'degraded'

export default function BookmarkModal({
  editing,
  preset,
  fromBookmarklet,
  onEditDuplicate,
  onClose,
}: BookmarkModalProps) {
  const { collections, addBookmark, updateBookmark, findDuplicate } = useBookmarks()
  const toast = useToast()

  const [url, setUrl] = useState(editing?.url ?? preset?.url ?? '')
  const [title, setTitle] = useState(editing?.title ?? preset?.title ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [collectionId, setCollectionId] = useState(editing?.collectionId ?? '')
  const [faviconUrl, setFaviconUrl] = useState(editing?.faviconUrl)
  const [cover, setCover] = useState(editing?.cover)

  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [urlError, setUrlError] = useState('')
  const [saving, setSaving] = useState(false)

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
    const urlChanged = Boolean(editing) && normalizeUrl(target) !== normalizeUrl(editing?.url ?? '')
    setFetchStatus('fetching')
    try {
      const meta = await fetchMetadata(target)
      if (seq !== requestSeq.current) return
      if (meta.title && !titleTouched.current) setTitle(meta.title)
      if (meta.description && !descTouched.current) setDescription(meta.description)
      // logo 不走 Microlink：展示时按域名解析；封面仍可选用抓取结果
      if (!editing || urlChanged) {
        setCover(meta.cover)
        setFaviconUrl(undefined)
      } else if (meta.cover) {
        setCover(meta.cover)
      }
      setFetchStatus(meta.title || meta.description ? 'fetched' : 'degraded')
    } catch {
      if (seq !== requestSeq.current) return
      if (urlChanged && editing) {
        setFaviconUrl(undefined)
        setCover(undefined)
      }
      setFetchStatus('degraded')
    }
  }

  // 新建时若带了 URL（粘贴/书签小工具），自动抓取一次
  useEffect(() => {
    if (!editing && preset?.url) void runFetch(preset.url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 粘贴/输入 URL 后防抖自动抓取（无需失焦）；编辑时仅当 URL 改变才抓
  const fetchDebounce = useRef<number | undefined>(undefined)
  const initialUrl = editing?.url ?? preset?.url ?? ''
  const onUrlChange = (raw: string) => {
    setUrl(raw)
    setUrlError('')
    window.clearTimeout(fetchDebounce.current)
    const target = normalizeUrl(raw)
    const prev = normalizeUrl(initialUrl)
    if (isValidUrl(target) && extractDomain(target) !== extractDomain(prev)) {
      setFaviconUrl(undefined)
      setCover(undefined)
    }
    if (editing && target === prev) return
    if (!isValidUrl(target)) return
    fetchDebounce.current = window.setTimeout(() => void runFetch(target), 650)
  }
  useEffect(() => () => window.clearTimeout(fetchDebounce.current), [])

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

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const finalUrl = normalizeUrl(url)
    if (!isValidUrl(finalUrl)) {
      setUrlError('请输入以 http:// 或 https:// 开头的有效链接')
      return
    }
    // 服务端对 (user_id, dedupe_key) 建了唯一索引，重复提交必然 409，
    // 所以这里直接拦住 —— 上一版的「仍然保存」已经没有意义了。
    if (duplicate) return

    const payload = {
      url: finalUrl,
      title: title.trim() || domain,
      description: description.trim() || undefined,
      faviconUrl,
      cover,
      collectionId: collectionId || undefined,
    }

    setSaving(true)
    try {
      if (editing) {
        await updateBookmark(editing.id, payload)
        toast(`已保存对「${payload.title}」的修改`)
      } else {
        await addBookmark(payload)
        toast(`「${payload.title}」已收藏`)
      }
      onClose()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : '保存失败，请重试', 'err')
    } finally {
      setSaving(false)
    }
  }

  // glass-field：内凹玻璃，与外层面板同一材质（实色框贴在玻璃上会割裂）。
  // 底色 / 描边 / 内凹投影 / 聚焦光晕全部由 CSS 类按主题给，
  // 这里只管尺寸与排版 —— 混用 Tailwind 的 focus:shadow 会把
  // 样式表里「内凹投影 + 光晕」的组合覆盖成只剩光晕，内凹感就没了。
  const inputCls =
    'glass-field h-10 w-full rounded-[10px] border px-3 text-[13.5px] text-ink outline-none transition-[background-color,border-color,box-shadow] duration-[var(--dur-2)] placeholder:text-ink4'
  const labelCls = 'mb-1.5 block text-[12px] font-semibold text-ink2'

  return (
    // 遮罩自带 backdrop-blur，把整屏压暗并糊掉。
    // 弹窗本体再叠一层 glass-sheet（24px），两层模糊叠加后
    // 背后的卡片彻底化开，表单只剩玻璃质感与自身内容。
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
        className="glass-sheet animate-pop flex max-h-[94dvh] w-full max-w-[440px] flex-col overflow-y-auto rounded-t-[18px] sm:rounded-[20px]"
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
                onChange={(e) => onUrlChange(e.target.value)}
                onBlur={(e) => {
                  const n = normalizeUrl(e.target.value)
                  if (n !== e.target.value) setUrl(n)
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
            <div className="flex items-start gap-2.5 rounded-[11px] border border-success-border bg-success-soft px-3.5 py-2.5">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />
              <div>
                <b className="text-[12.5px] text-success-ink">已自动获取网站信息</b>
                <p className="text-[11.5px] text-success-text">标题、描述与图标均可手动修改</p>
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

          {duplicate && (
            <div className="flex items-start gap-2.5 rounded-[11px] border border-warn-border bg-warn-soft px-3.5 py-2.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warn-ink" />
              <div className="text-[12px] leading-5 text-warn-text">
                已收藏过相同链接：「{duplicate.title}」
                {onEditDuplicate && (
                  <button
                    type="button"
                    onClick={() => onEditDuplicate(duplicate)}
                    className="ml-1 font-semibold underline underline-offset-2 hover:text-warn-ink"
                  >
                    去编辑它
                  </button>
                )}
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
              className="glass-field w-full resize-y rounded-[10px] border px-3 py-2.5 text-[13px] leading-6 text-ink outline-none transition-[background-color,border-color,box-shadow] duration-[var(--dur-2)] placeholder:text-ink4"
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
            {/* 分组的增删改统一在设置页，这里只做选择。
                早先这里内嵌过「新建分组」表单，与设置页的分组管理重复，
                且无法选图标（emoji 已下线）。 */}
            <select
              id="bm-col"
              className={`${inputCls} glass-select`}
              value={collectionId || '__none__'}
              onChange={(e) => setCollectionId(e.target.value === '__none__' ? '' : e.target.value)}
            >
              <option value="__none__">未分组</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {collections.length === 0 && (
              <a
                href="#/settings"
                className="mt-1.5 inline-block text-[11.5px] text-accent hover:underline"
              >
                还没有分组，去设置里创建 →
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-line px-[22px] py-3.5">
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
              disabled={Boolean(duplicate) || saving}
              title={duplicate ? '这条链接已经收藏过了' : undefined}
              className="flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-ink disabled:opacity-50"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {editing ? '保存修改' : '保存书签'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
