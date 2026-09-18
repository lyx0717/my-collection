import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Collection } from '../types'

interface CollectionModalProps {
  /** 传入则为编辑，否则新建 */
  initial?: Collection | null
  existingNames: string[]
  onSubmit: (name: string, emoji?: string) => void
  onClose: () => void
}

export default function CollectionModal({
  initial,
  existingNames,
  onSubmit,
  onClose,
}: CollectionModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '')
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
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
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请填写分组名称')
      return
    }
    if (
      existingNames.some((n) => n === trimmed) &&
      trimmed !== initial?.name
    ) {
      setError('已存在同名分组')
      return
    }
    onSubmit(trimmed, emoji.trim() || undefined)
    onClose()
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[65] flex items-center justify-center bg-ink/40 p-6 backdrop-blur-[3px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={initial ? '编辑分组' : '新建分组'}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop w-full max-w-[380px] rounded-[18px] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(28,27,25,.35)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-bold">{initial ? '编辑分组' : '新建分组'}</h2>
            <p className="mt-0.5 text-[12px] text-ink3">
              {initial ? '修改分组名称或图标' : '给书签建一个新的归类'}
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

        <div className="mt-5 flex gap-3">
          <div className="w-20 shrink-0">
            <label className="mb-1.5 block text-[12px] font-semibold text-ink2" htmlFor="col-emoji">
              图标
            </label>
            <input
              id="col-emoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              placeholder="📁"
              className="h-10 w-16 shrink-0 rounded-[10px] border border-line bg-white px-2 text-center text-[15px] placeholder:text-[#b5b1a8] focus:border-accent focus:shadow-[0_0_0_3px_rgba(62,92,255,.12)]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-[12px] font-semibold text-ink2" htmlFor="col-name">
              名称
            </label>
            <input
              ref={nameRef}
              id="col-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="例如：学习资料"
              className="h-10 w-full min-w-0 rounded-[10px] border border-line bg-white px-3 text-[13.5px] placeholder:text-[#b5b1a8] focus:border-accent focus:shadow-[0_0_0_3px_rgba(62,92,255,.12)]"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-[10px] border border-line2 px-4 text-[13px] font-medium text-ink2 hover:bg-surface-2"
          >
            取消
          </button>
          <button
            type="submit"
            className="h-9 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-white hover:bg-accent-ink"
          >
            {initial ? '保存修改' : '创建分组'}
          </button>
        </div>
      </form>
    </div>
  )
}
