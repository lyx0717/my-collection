import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Search, Trash2, X } from 'lucide-react'
import { useSearchEngines } from '../hooks/useSearchEngines'
import { engineDomain, parseEngineUrl } from '../lib/engines'
import Favicon from './Favicon'

/** 顶部搜索引擎框：切换百度/必应/Google/自定义，回车新标签页打开结果 */
export default function EngineSearchBox() {
  const { engines, active, select, addEngine, removeEngine } = useSearchEngines()
  const [menuOpen, setMenuOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  /** 网址输一半时不报错，只把成功识别结果实时显示出来 */
  const parsed = useMemo(() => (newUrl.trim() ? parseEngineUrl(newUrl) : null), [newUrl])
  const nameHint =
    parsed?.ok && parsed.template.name
      ? `引擎名称（留空默认「${parsed.template.name}」）`
      : '引擎名称（可选）'

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const submit = () => {
    const q = query.trim()
    if (!q) return
    window.open(active.url.replace(/%s/g, encodeURIComponent(q)), '_blank', 'noopener,noreferrer')
  }

  const confirmAdd = () => {
    if (!parsed) return setError('请粘贴搜索后的网址')
    if (!parsed.ok) return setError(parsed.error)
    if (!addEngine(newName, newUrl)) return setError('添加失败，请检查链接')
    setNewName('')
    setNewUrl('')
    setError('')
    setAdding(false)
    setMenuOpen(false)
  }

  return (
    // 固定上限 380px：宽屏时不撑满整条顶栏（之前 flex-1 会一直拉到最右端，
    // 看着像被拉长的输入条）；窄屏时靠 w-full 自适应缩窄。
    <div className="flex h-9 w-full min-w-0 max-w-[600px] items-center gap-1 rounded-[10px] border border-line bg-canvas/70 pl-2 pr-1 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-ring)]">
      {/* 引擎切换：只留 favicon + 箭头，引擎名交给输入框 placeholder。
          曾经这里是「favicon + 中文名 + 箭头」≈90px，常驻顶栏第二显眼的位置，
          而它一个月才切一次。名字并不丢失 —— placeholder 一直是
          「搜网页：必应（回车打开）」，顺便还说明了回车这个动作。 */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          title={`搜索引擎：${active.name}`}
          className="flex h-[28px] w-[34px] items-center justify-center gap-1 rounded-[6px] text-ink2 transition-colors hover:bg-surface hover:text-accent"
        >
          <Favicon domain={engineDomain(active)} title={active.name} size="sm" />
          <ChevronDown size={12} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className={`animate-pop absolute left-0 top-11 z-50 max-w-[calc(100vw-5rem)] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_24px_60px_-20px_rgba(30,40,60,.35)] ${adding ? 'w-[22rem]' : 'w-72'}`}>
            {engines.map((e) => (
              <div
                key={e.id}
                className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] hover:bg-surface-2"
              >
                <button
                  onClick={() => {
                    select(e.id)
                    setMenuOpen(false)
                  }}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className={`h-4 w-4 ${active.id === e.id ? 'text-accent' : 'text-transparent'}`}>
                    <Check size={15} />
                  </span>
                  <Favicon domain={engineDomain(e)} title={e.name} size="sm" />
                  <span className={active.id === e.id ? 'font-semibold text-accent-ink' : 'text-ink'}>
                    {e.name}
                  </span>
                  {e.builtin && (
                    <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] text-ink3">内置</span>
                  )}
                </button>
                {!e.builtin && (
                  <button
                    onClick={() => removeEngine(e.id)}
                    aria-label={`删除 ${e.name}`}
                    className="hidden h-6 w-6 items-center justify-center rounded text-ink3 hover:bg-danger/10 hover:text-danger group-hover:flex"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}

            {!adding ? (
              <button
                onClick={() => setAdding(true)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-line px-2.5 py-2.5 text-[13px] font-medium text-accent hover:bg-accent-soft"
              >
                <Plus size={14} />
                添加自定义搜索引擎
              </button>
            ) : (
              <div className="mt-1 space-y-2 border-t border-line p-2.5">
                <input
                  autoFocus
                  value={newUrl}
                  onChange={(e) => {
                    setNewUrl(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
                  placeholder="粘贴搜索后的网址"
                  className="h-10 w-full rounded-lg border border-line px-2.5 text-[12px] outline-none focus:border-accent"
                />
                <input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
                  placeholder={nameHint}
                  className="h-9 w-full rounded-lg border border-line px-2.5 text-[13px] outline-none focus:border-accent"
                />
                {error ? (
                  <p className="text-[11.5px] leading-4 text-danger">{error}</p>
                ) : parsed?.ok ? (
                  <p
                    className="flex items-start gap-1.5 text-[11px] leading-4 text-ink3"
                    title={parsed.template.url}
                  >
                    <Check size={12} className="mt-0.5 shrink-0 text-accent" />
                    <span className="min-w-0 truncate">
                      已识别「{parsed.template.name}」
                      {parsed.template.param ? `，关键词参数 ${parsed.template.param}` : '，使用 %s 占位'}
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] leading-4 text-ink3">
                    在站内搜索后复制地址栏链接，会自动定位关键词；手写 %s 模板也兼容。
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setAdding(false)
                      setError('')
                    }}
                    className="flex h-8 items-center rounded-lg px-3 text-[12.5px] text-ink3 hover:bg-surface-2"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmAdd}
                    className="flex h-8 items-center rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-white hover:bg-accent-ink"
                  >
                    添加
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        id="engine-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={`搜网页：${active.name}（回车打开）`}
        className="h-full w-full min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink4"
      />
      {query ? (
        <button
          onClick={() => setQuery('')}
          aria-label="清空"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-ink3 hover:text-ink"
        >
          <X size={14} />
        </button>
      ) : (
        <button
          onClick={submit}
          aria-label="搜索"
          className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[6px] text-ink3 hover:bg-surface hover:text-accent"
        >
          <Search size={16} />
        </button>
      )}
    </div>
  )
}
