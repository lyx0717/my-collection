import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Search, Trash2, X } from 'lucide-react'
import { useSearchEngines } from '../hooks/useSearchEngines'

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
    window.open(active.url.replace('%s', encodeURIComponent(q)), '_blank', 'noopener,noreferrer')
  }

  const confirmAdd = () => {
    if (!newName.trim()) return setError('请填写引擎名称')
    if (!/^https?:\/\/.*/.test(newUrl.trim()) || !newUrl.includes('%s')) {
      return setError('查询地址需以 http(s):// 开头，并包含 %s 占位符')
    }
    addEngine(newName, newUrl)
    setNewName('')
    setNewUrl('')
    setError('')
    setAdding(false)
    setMenuOpen(false)
  }

  return (
    <div className="flex h-[38px] max-w-[560px] flex-1 items-center gap-1 rounded-[11px] border border-line bg-canvas pl-2 pr-1 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(62,92,255,.12)]">
      {/* 引擎切换 */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-[30px] items-center gap-1 rounded-lg bg-white px-2 text-[12.5px] font-semibold text-ink2 shadow-[0_1px_2px_rgba(28,27,25,.06)] transition-colors hover:text-accent"
        >
          {active.name}
          <ChevronDown size={13} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="animate-pop absolute left-0 top-10 z-50 w-72 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_24px_60px_-20px_rgba(28,27,25,.35)]">
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
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="引擎名称，如：知乎"
                  className="h-9 w-full rounded-lg border border-line px-2.5 text-[13px] outline-none focus:border-accent"
                />
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://www.zhihu.com/search?q=%s"
                  className="h-9 w-full rounded-lg border border-line px-2.5 text-[12px] outline-none focus:border-accent"
                />
                {error && <p className="text-[11.5px] text-danger">{error}</p>}
                <p className="text-[11px] leading-4 text-ink3">用 %s 代替关键词位置</p>
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
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={`搜网页：${active.name}（回车打开）`}
        className="h-full w-full min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[#aca89f]"
      />
      {query ? (
        <button
          onClick={() => setQuery('')}
          aria-label="清空"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink3 hover:text-ink"
        >
          <X size={14} />
        </button>
      ) : (
        <button
          onClick={submit}
          aria-label="搜索"
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-ink3 hover:bg-white hover:text-accent"
        >
          <Search size={16} />
        </button>
      )}
    </div>
  )
}
