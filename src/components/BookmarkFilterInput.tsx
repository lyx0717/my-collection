import { useState } from 'react'
import { Search, X } from 'lucide-react'

interface BookmarkFilterInputProps {
  value: string
  onChange: (v: string) => void
}

/**
 * 书签库内的筛选搜索（区别于顶栏的互联网搜索引擎）。
 *
 * 结果计数不放在这里：输入框内右侧的数字会被读成「自动补全的候选数」，
 * 而真实结果数已经在标题旁（「全部书签 148 条」，筛选时变成「3 条 / 148」）。
 *
 * 聚焦时下方浮出快捷键提示。用绝对定位而不是新增一行 ——
 * 工具条只有 36px 高，插一行会把整排按钮挤下去。
 * 入口常年只有一个「/」角标，新用户看不见快捷键，提示总得在某个时刻露一次面。
 */
export default function BookmarkFilterInput({ value, onChange }: BookmarkFilterInputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="relative w-full sm:w-72">
      <div className="flex h-9 w-full items-center gap-2 rounded-[10px] border border-line bg-surface px-3 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-ring)]">
        <Search size={14} className="shrink-0 text-ink3" />
        <input
          id="bookmark-filter-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="筛选书签库（标题/域名/描述）…"
          className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-ink4"
        />
        {value ? (
          <button
            onClick={() => onChange('')}
            aria-label="清空筛选"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink3 hover:text-ink"
          >
            <X size={12} />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded border border-line2 border-b-2 px-1 py-0.5 font-mono text-[10px] text-ink3 sm:block">
            /
          </kbd>
        )}
      </div>

      {focused && (
        <div className="animate-fade-in absolute top-11 left-0 z-20 flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink3 shadow-[0_8px_24px_-12px_rgba(30,40,60,.18)]">
          <span>
            <kbd className="font-mono text-ink2">n</kbd> 新建书签
          </span>
          <span className="h-3 w-px bg-line2" />
          <span>
            <kbd className="font-mono text-ink2">esc</kbd> 清除筛选
          </span>
        </div>
      )}
    </div>
  )
}
