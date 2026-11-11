import { useAppearance } from '../../store/AppearanceContext'
import { resolvedTheme } from '../../lib/appearance'
import GlassThemeToggle from '../GlassThemeToggle'
import SectionTitle from './SectionTitle'

export default function AppearanceSection() {
  const { theme, setTheme } = useAppearance()
  const following = theme === 'system'

  return (
    <section id="sec-appearance" className="scroll-mt-24">
      <SectionTitle
        title="外观"
        desc="界面固定为玻璃风格，拨动开关切换浅色 / 深色，偏好保存在本浏览器。"
      />
      <div className="glass-card rounded-[20px] border border-line2/70 p-5">
        <div className="flex flex-wrap items-center justify-center gap-5">
          <GlassThemeToggle size="lg" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <p className="mt-3 text-[12px] leading-5 text-ink3">
            「跟随系统」随操作系统的深色模式即时切换，再按一次回到手动。
          </p>
          <button
            type="button"
            aria-pressed={following}
            onClick={() => setTheme(following ? resolvedTheme('system') : 'system')}
            className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-[background-color,color,border-color] duration-[var(--dur-2)] ${
              following
                ? 'border-accent/60 bg-accent-soft text-accent-ink'
                : 'border-line2/70 bg-surface/60 text-ink2 hover:border-line2 hover:bg-surface-2 hover:text-ink'
            }`}
          >
            跟随系统
          </button>
        </div>
      </div>
    </section>
  )
}
