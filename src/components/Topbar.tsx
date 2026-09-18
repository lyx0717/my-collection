import { Link } from 'react-router-dom'
import { Menu, Plus, Settings } from 'lucide-react'
import EngineSearchBox from './EngineSearchBox'

interface TopbarProps {
  onAdd: () => void
  onOpenMenu: () => void
}

export default function Topbar({ onAdd, onOpenMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-[62px] shrink-0 items-center gap-2.5 border-b border-line bg-surface/95 px-4 backdrop-blur sm:gap-3.5 sm:px-6">
      <button
        onClick={onOpenMenu}
        aria-label="打开分组菜单"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-line text-ink2 lg:hidden"
      >
        <Menu size={17} />
      </button>

      <EngineSearchBox />

      <Link
        to="/settings"
        aria-label="设置"
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] border border-line bg-white text-ink2 transition-colors hover:border-line2 hover:bg-surface-2 hover:text-accent"
      >
        <Settings size={17} />
      </Link>

      <button
        onClick={onAdd}
        className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[11px] bg-accent px-3 text-[13px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(62,92,255,.55)] transition-colors hover:bg-accent-ink sm:px-4"
      >
        <Plus size={15} strokeWidth={2.4} />
        <span className="hidden sm:inline">添加书签</span>
      </button>
    </header>
  )
}
