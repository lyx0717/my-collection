import { Link } from 'react-router-dom'
import { Menu, Plus, Settings } from 'lucide-react'
import EngineSearchBox from './EngineSearchBox'
import { useAppearance } from '../store/AppearanceContext'

interface TopbarProps {
  onAdd: () => void
  onOpenMenu: () => void
}

export default function Topbar({ onAdd, onOpenMenu }: TopbarProps) {
  const { glassMode } = useAppearance()
  // 实心：文档流 sticky；玻璃：绝对定位叠层，便于内容从底下滚过
  const positionCls =
    glassMode === 'glass'
      ? 'glass-topbar absolute inset-x-0 top-0 z-40'
      : 'sticky top-0 z-40 shrink-0'

  return (
    <header
      className={`${positionCls} flex h-[62px] items-center gap-2.5 border-b border-line bg-surface/95 px-4 backdrop-blur sm:gap-3.5 sm:px-6`}
    >
      <button
        onClick={onOpenMenu}
        aria-label="打开分组菜单"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-line text-ink2 lg:hidden"
      >
        <Menu size={17} />
      </button>

      <EngineSearchBox />

      <button
        onClick={onAdd}
        className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[11px] bg-accent px-3 text-[13px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(62,92,255,.55)] transition-colors hover:bg-accent-ink sm:px-4"
      >
        <Plus size={15} strokeWidth={2.4} />
        <span className="hidden sm:inline">添加书签</span>
      </button>

      <Link
        to="/settings"
        aria-label="设置"
        className="ml-auto flex h-[38px] shrink-0 items-center gap-1.5 rounded-[11px] border border-line bg-white px-2.5 text-[13px] font-medium text-ink2 transition-colors hover:border-line2 hover:bg-surface-2 hover:text-accent sm:px-3"
      >
        <Settings size={16} />
        <span className="hidden sm:inline">设置</span>
      </Link>
    </header>
  )
}
