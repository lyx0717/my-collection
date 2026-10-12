import { Moon, Sun } from 'lucide-react'
import { useAppearance } from '../store/AppearanceContext'
import { resolvedTheme } from '../lib/appearance'

/**
 * 明暗切换：顶栏快捷按钮。
 *
 * 为什么是「两态跳转」而不是三态循环：设置页已经有完整的
 * 浅色 / 深色 / 跟随系统 三选一，这里只做最常用的快速来回切，
 * 按钮语义必须是「切到某个明确状态」而不是「轮转到下一个未知状态」——
 * 否则用户永远不知道自己按完之后会变成什么样。
 *
 * 当前处于「跟随系统」时，按 resolvedTheme 的实际呈现值取反：
 * 系统是深色、界面显示深色，那按一下就该变浅色，符合直觉。
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useAppearance()
  const isDark = resolvedTheme(theme) === 'dark'

  const next = isDark ? 'light' : 'dark'
  const label = isDark ? '切换到浅色模式' : '切换到深色模式'

  // 两个图标叠在同一个格子里靠透明度/缩放互切，
  // 而不是条件渲染换 DOM —— 换 DOM 会让图标重新挂载、丢失过渡。
  // motion-reduce 兜底：系统开启「减少动态」时直接切换，不做旋转缩放。
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-ink2 transition-colors hover:bg-surface-2 hover:text-accent ${className}`}
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        <Sun
          size={16}
          aria-hidden
          className={`absolute transition-[opacity,transform] duration-[var(--dur-2)] ease-[var(--ease-out)] motion-reduce:transition-none ${
            isDark ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
          }`}
        />
        <Moon
          size={16}
          aria-hidden
          className={`absolute transition-[opacity,transform] duration-[var(--dur-2)] ease-[var(--ease-out)] motion-reduce:transition-none ${
            isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'
          }`}
        />
      </span>
    </button>
  )
}
