import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Category, Item, ItemInput } from '../types'
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories'
import { parseTags, tagsToText } from '../utils/tags'

interface AdminItemFormProps {
  /** null 表示新增 */
  initial: Item | null
  onSubmit: (input: ItemInput) => void
  onCancel: () => void
}

type Errors = Partial<Record<'title' | 'url', string>>

function cleanOptional(value: string): string | undefined {
  const v = value.trim()
  return v ? v : undefined
}

function isValidUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false
  try {
    const u = new URL(value)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

const fieldClass =
  'h-10 w-full rounded-md border border-ink-700 bg-ink-950/70 px-3 text-sm text-paper placeholder:text-paper-muted/60 transition-colors focus:border-gold/60 focus:outline-none'
const labelClass = 'mb-1.5 block text-xs tracking-widest text-paper-dim'

export default function AdminItemForm({ initial, onSubmit, onCancel }: AdminItemFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'movie')
  const [source, setSource] = useState(initial?.source ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [cover, setCover] = useState(initial?.cover ?? '')
  const [tagsText, setTagsText] = useState(tagsToText(initial?.tags ?? []))
  const [description, setDescription] = useState(initial?.description ?? '')
  const [errors, setErrors] = useState<Errors>({})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onCancel])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    if (!title.trim()) next.title = '请填写藏品名称'
    if (url.trim() && !isValidUrl(url.trim())) next.url = '链接需以 http:// 或 https:// 开头'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    onSubmit({
      title: title.trim(),
      category,
      source: cleanOptional(source),
      url: cleanOptional(url),
      cover: cleanOptional(cover),
      description: cleanOptional(description),
      tags: parseTags(tagsText),
    })
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={initial ? '编辑藏品' : '新增藏品'}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="animate-drawer flex h-dvh w-full max-w-md flex-col overflow-y-auto border-l border-gold/25 bg-ink-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-ink-800 px-6 py-4">
          <div>
            <h2 className="font-serif text-xl tracking-wide text-paper">
              {initial ? '编辑藏品' : '新增藏品'}
            </h2>
            <p className="mt-0.5 text-xs text-paper-muted">
              {initial ? '修改后保存，登记号保持不变' : '收入一件新的藏品'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="关闭"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-700 text-paper-dim hover:border-gold/50 hover:text-gold"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 px-6 py-6">
          <div>
            <label className={labelClass} htmlFor="f-title">
              名称 <span className="text-gold">*</span>
            </label>
            <input
              id="f-title"
              className={fieldClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：花样年华"
              autoFocus
            />
            {errors.title && <p className="mt-1.5 text-xs text-red-400/90">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="f-category">
                分类
              </label>
              <select
                id="f-category"
                className={fieldClass}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORY_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORIES[key].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="f-source">
                来源
              </label>
              <input
                id="f-source"
                className={fieldClass}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="导演 / 地名 / 作者"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="f-url">
              原链接
            </label>
            <input
              id="f-url"
              className={fieldClass}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              inputMode="url"
            />
            {errors.url ? (
              <p className="mt-1.5 text-xs text-red-400/90">{errors.url}</p>
            ) : (
              <p className="mt-1.5 text-[11px] text-paper-muted">留空也可以，卡片将不显示外链入口</p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="f-cover">
              封面图链接
            </label>
            <input
              id="f-cover"
              className={fieldClass}
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="https://…（留空使用排版封面）"
              inputMode="url"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="f-tags">
              标签
            </label>
            <input
              id="f-tags"
              className={fieldClass}
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="纪录片，王家卫，香港电影"
            />
            <p className="mt-1.5 text-[11px] text-paper-muted">用逗号分隔多个标签，可中英混排</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="f-desc">
              短评 / 备注
            </label>
            <textarea
              id="f-desc"
              rows={5}
              className="w-full resize-y rounded-md border border-ink-700 bg-ink-950/70 px-3 py-2.5 text-sm leading-6 text-paper placeholder:text-paper-muted/60 transition-colors focus:border-gold/60 focus:outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="为什么想留下它？记一笔……"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink-800 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-ink-600 px-4 py-2 text-sm text-paper-dim transition-colors hover:border-gold/40 hover:text-paper"
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded-md bg-gold px-5 py-2 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-bright"
          >
            {initial ? '保存修改' : '收入馆藏'}
          </button>
        </div>
      </form>
    </div>
  )
}
