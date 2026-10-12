import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Collection } from '../types'
import {
  COLLECTION_ICON_NAMES,
  iconNameForCollection,
  renderCollectionIcon,
  resolveCollectionIcon,
} from '../lib/collectionIcons'

interface CollectionModalProps {
  /** 传入则为编辑，否则新建 */
  initial?: Collection | null
  existingNames: string[]
  onSubmit: (name: string, icon?: string) => void
  onClose: () => void
}

export default function CollectionModal({
  initial,
  existingNames,
  onSubmit,
  onClose,
}: CollectionModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  // 未指定时先给一个按名称 hash 得到的图标，用户不选也能保存
  const [icon, setIcon] = useState<string | undefined>(initial?.icon ?? undefined)
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
    if (existingNames.some((n) => n === trimmed) && trimmed !== initial?.name) {
      setError('已存在同名分组')
      return
    }
    onSubmit(trimmed, icon)
    onClose()
  }

  // 预览当前生效的图标：未选时按名称 hash 回退。
  // 全部按**字符串名字**比较，不再混用组件引用 ——
  // 组件是对象，两次 import 得到的引用不一定全等，用它做选中判断本就不可靠。
  // resolveCollectionIcon 再兜一层非法值（旧 seed / 手工导入的脏数据），
  // 保证不会出现「一个都选不中」的空洞。
  const preview = resolveCollectionIcon(
    icon ?? iconNameForCollection({ name: name.trim() || 'new' }),
    name.trim() || 'new',
  )

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
        className="animate-pop max-h-[86vh] w-full max-w-[420px] overflow-y-auto rounded-[20px] bg-surface p-6 shadow-[0_24px_60px_-20px_rgba(30,40,60,.35)]"
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
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-ink3 hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5">
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
            className="h-10 w-full min-w-0 rounded-[10px] border border-line bg-surface px-3 text-[13.5px] placeholder:text-ink4 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-ring)]"
          />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[12px] font-semibold text-ink2">图标</span>
            <span className="text-[11px] text-ink3">与导航栏显示一致</span>
          </div>
          {/* 图标网格：选中态用 accent 填充，与导航选中态同一套。
              key 与选中判断都基于图标名，天然唯一、必然只有一个命中。 */}
          <div className="grid grid-cols-8 gap-1.5">
            {COLLECTION_ICON_NAMES.map((iconName) => {
              const selected = preview === iconName
              return (
                <button
                  key={iconName}
                  type="button"
                  title={iconName}
                  aria-label={iconName}
                  aria-pressed={selected}
                  onClick={() => setIcon(iconName)}
                  className={`flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors ${
                    selected
                      ? 'bg-accent text-white'
                      : 'bg-surface-2 text-ink3 hover:bg-surface-2/70 hover:text-ink'
                  }`}
                >
                  {renderCollectionIcon(iconName, 17)}
                </button>
              )
            })}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] leading-4 text-ink3">
            {renderCollectionIcon(preview, 13)}
            导航里会显示这个图标；不选则按分组名自动分配一个固定的。
          </p>
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
