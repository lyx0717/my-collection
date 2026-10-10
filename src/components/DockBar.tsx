import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bookmark, Settings } from 'lucide-react'
import EngineSearchBox from './EngineSearchBox'

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
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  return (
    <header className="glass-chrome fixed inset-x-0 top-0 z-40 h-14 border-b px-4 transition-[background-color,border-color] duration-[var(--dur-3)] ease-[var(--ease-out)] sm:px-6">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 sm:gap-4">
        <Link
          to="/"
          aria-label="回到书签首页"
          className="flex shrink-0 items-center gap-2 rounded-[13px] pr-1 pl-0.5 transition-opacity hover:opacity-80"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-accent shadow-[0_4px_12px_-4px_var(--accent-shadow)]">
            <Bookmark size={14} className="text-white" fill="white" />
          </span>
          <span
            className="overflow-hidden text-[14px] font-bold whitespace-nowrap transition-[max-width,opacity] duration-[var(--dur-3)]"
            style={{ maxWidth: scrolled ? 0 : 90, opacity: scrolled ? 0 : 1 }}
          >
            我的书签
          </span>
        </Link>

        {/* 搜索框固定上限 380px（组件内 maxWidth），宽屏不撑满、窄屏自适应缩窄 */}
        <EngineSearchBox />

        <Link
          to="/settings"
          aria-label="设置"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-ink2 transition-colors hover:bg-surface-2 hover:text-accent ${
            pathname === '/settings' ? 'bg-accent-soft text-accent' : ''
          }`}
        >
          <Settings size={16} />
        </Link>
      </div>
    </header>
  )
}
