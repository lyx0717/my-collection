import { useAppearance } from '../../store/AppearanceContext'
import { useToast } from '../Toast'
import SectionTitle from './SectionTitle'

const THEME_OPTIONS = [
  ['light', '浅色'],
  ['dark', '深色'],
  ['system', '跟随系统'],
] as const

export default function AppearanceSection() {
  const { theme, setTheme } = useAppearance()
  const toast = useToast()

  return (
    <section id="sec-appearance" className="scroll-mt-24">
      <SectionTitle title="外观" desc="界面固定为玻璃风格，这里只切换浅色 / 深色主题，偏好保存在本浏览器。" />
      <div className="glass-card rounded-[20px] border border-line2/70 p-5">
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map(([value, title]) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => {
                setTheme(value)
                toast(
                  value === 'dark'
                    ? '已切换为深色主题'
                    : value === 'light'
                      ? '已切换为浅色主题'
                      : '已跟随系统主题',
                )
              }}
              className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-[background-color,color,border-color,box-shadow] duration-[var(--dur-2)] ${
                theme === value
                  ? 'border-accent bg-accent font-semibold text-white shadow-[0_4px_14px_-6px_var(--accent-shadow)]'
                  : 'border-line2/70 bg-surface/60 text-ink2 hover:border-line2 hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-5 text-ink3">
          「跟随系统」随操作系统的深色模式即时切换。
        </p>
      </div>
    </section>
  )
}
