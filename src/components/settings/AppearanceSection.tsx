import { useAppearance } from '../../store/AppearanceContext'
import { useToast } from '../Toast'
import SectionTitle from './SectionTitle'

const THEME_OPTIONS = [
  ['light', '浅色'],
  ['dark', '深色'],
  ['system', '跟随系统'],
] as const

export default function AppearanceSection() {
  const { glassMode, setGlassMode, theme, setTheme } = useAppearance()
  const toast = useToast()

  return (
    <section id="sec-appearance" className="scroll-mt-24">
      <SectionTitle title="外观" desc="切换书签库的界面风格，偏好保存在本浏览器。" />
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(30,40,60,.05)]">
        <p className="mb-3 text-[13px] font-semibold text-ink2">界面风格</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(
            [
              ['solid', '实心', '不透明卡片与顶栏，阅读对比度最高'],
              ['glass', '玻璃', '顶栏/侧栏半透明，紧凑卡片悬停磨砂'],
            ] as const
          ).map(([value, title, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setGlassMode(value)
                toast(value === 'glass' ? '已切换为玻璃模式' : '已切换为实心模式')
              }}
              className={`rounded-xl border p-4 text-left transition-colors ${
                glassMode === value
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface hover:border-line2'
              }`}
            >
              <p
                className={`text-[13.5px] font-semibold ${
                  glassMode === value ? 'text-accent-ink' : 'text-ink'
                }`}
              >
                {title}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-ink3">{hint}</p>
            </button>
          ))}
        </div>

        <p className="mb-3 mt-5 text-[13px] font-semibold text-ink2">界面主题</p>
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
              className={`rounded-lg border px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
                theme === value
                  ? 'border-accent bg-accent-soft text-accent-ink'
                  : 'border-line bg-surface text-ink2 hover:border-line2 hover:text-ink'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[11.5px] leading-5 text-ink3">「跟随系统」随操作系统的深色模式即时切换。</p>
      </div>
    </section>
  )
}
