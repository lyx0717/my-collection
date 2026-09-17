import { NavLink } from 'react-router-dom'
import { LibraryBig, Settings2 } from 'lucide-react'

export default function Header() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm tracking-wide transition-colors',
      isActive
        ? 'bg-gold/10 text-gold-bright'
        : 'text-paper-dim hover:bg-ink-800 hover:text-paper',
    ].join(' ')

  return (
    <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <NavLink to="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/35 bg-ink-900 font-serif text-lg text-gold transition-colors group-hover:border-gold/70">
            藏
          </span>
          <span className="leading-none">
            <span className="block font-serif text-base tracking-[0.2em] text-paper">藏物志</span>
            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.28em] text-paper-muted">
              Personal Collection
            </span>
          </span>
        </NavLink>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>
            <LibraryBig size={15} strokeWidth={1.8} />
            <span className="hidden sm:inline">藏品馆</span>
          </NavLink>
          <NavLink to="/admin" className={linkClass}>
            <Settings2 size={15} strokeWidth={1.8} />
            <span className="hidden sm:inline">管理</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
