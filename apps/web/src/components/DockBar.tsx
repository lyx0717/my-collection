import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bookmark, LogOut, Settings } from 'lucide-react'
import EngineSearchBox from './EngineSearchBox'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../store/AuthContext'

/**
 * 顶部通栏导航（fixed，贴边通栏）。
 *
 * 为什么不再是悬浮胶囊：分组导航已经是悬浮胶囊了，顶栏若也悬浮，
 * 页面顶部会同时出现两个漂浮物，反而失去稳定的头部锚点。
 * 通栏贴边给出确定边界，悬浮的分组导航叠在它下面才有「浮在内容之上」的层次。
 *
 * 「添加书签」按钮不在这里 —— 它与内容区的「多选 / 视图切换」是一组操作，
 * 放在顶栏会离上下文太远（用户要「加书签」时，视线在卡片区，不在顶栏）。
 * 现在它与多选、视图切换同在内容工具条右侧，见 HomePage。
 *
 * 高度固定 56px（h-14）：下方 sticky 分组导航以 top-14 吸顶，
 * 若顶栏高度可变，两者之间会露出缝隙。
 */
export default function DockBar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击别处或按 Esc 关掉账号菜单
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <header className="glass-chrome fixed inset-x-0 top-0 z-40 h-14 border-b px-4 sm:px-6">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 sm:gap-4">
        <Link
          to="/"
          aria-label="回到书签首页"
          className="flex shrink-0 items-center gap-2 rounded-[13px] pr-1 pl-0.5 transition-opacity hover:opacity-80"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-accent shadow-[0_4px_12px_-4px_var(--accent-shadow)]">
            <Bookmark size={14} className="text-white" fill="white" />
          </span>
          {/* 移动端隐藏站名：窄屏横向空间紧张（搜索框 + 主题 + 设置已占满），
              此时图标本身足以表意，留着「我的书签」只会把搜索框挤窄。
              用项目的 sm 断点（≤640px 隐藏），与全站响应式口径一致。 */}
          <span className="text-[14px] font-bold whitespace-nowrap max-sm:hidden">我的书签</span>
        </Link>

        {/* 搜索框固定上限 380px（组件内 maxWidth），宽屏不撑满、窄屏自适应缩窄 */}
        <EngineSearchBox />

        {/* ml-auto：把右侧操作组推到通栏最右，与搜索框宽度解耦。
            搜索框只有 380px 上限，若靠自然流排布，宽屏下按钮会紧贴搜索框右侧。 */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {/* 明暗切换：高频操作，抬到顶栏一键可达，不必先进设置页。
              完整三态（浅色 / 深色 / 跟随系统）仍在设置页「外观」里。 */}
          <ThemeToggle />
          <Link
            to="/settings"
            aria-label="设置"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-ink2 transition-colors hover:bg-surface-2 hover:text-accent ${
              pathname === '/settings' ? 'bg-accent-soft text-accent' : ''
            }`}
          >
            <Settings size={16} />
          </Link>

          {/* 账号：显示登录邮箱的首字母，点开是邮箱 + 退出登录 */}
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="账号"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-bold text-accent-ink transition-colors hover:bg-accent/20"
            >
              {(user?.email ?? '?').charAt(0).toUpperCase()}
            </button>

            {menuOpen && (
              <div className="glass-sheet animate-pop absolute top-11 right-0 z-50 w-[210px] rounded-[14px] p-1.5">
                <p
                  className="truncate px-3 py-2 text-[12px] text-ink3"
                  title={user?.email}
                >
                  {user?.email ?? '未登录'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    void logout()
                  }}
                  className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] text-ink2 transition-colors hover:bg-surface-2 hover:text-danger"
                >
                  <LogOut size={14} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
