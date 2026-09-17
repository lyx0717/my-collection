import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  resultCount: number
}

export default function SearchBar({ value, onChange, resultCount }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onChange('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChange])

  return (
    <div className="group relative">
      <Search
        size={17}
        strokeWidth={1.8}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper-muted transition-colors group-focus-within:text-gold"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索藏品名称、备注或标签……"
        className="h-12 w-full rounded-lg border border-ink-700 bg-ink-900 pl-11 pr-24 text-sm text-paper placeholder:text-paper-muted/70 transition-colors focus:border-gold/60 focus:outline-none"
      />
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {value ? (
          <button
            onClick={() => onChange('')}
            aria-label="清空搜索"
            className="flex h-6 w-6 items-center justify-center rounded text-paper-muted hover:text-gold"
          >
            <X size={14} />
          </button>
        ) : (
          <kbd className="hidden rounded border border-ink-700 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-paper-muted sm:block">
            /
          </kbd>
        )}
        {value && (
          <span className="font-mono text-[11px] tracking-wider text-gold/80">{resultCount} 件</span>
        )}
      </div>
    </div>
  )
}
