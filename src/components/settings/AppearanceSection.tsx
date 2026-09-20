import { useAppearance } from '../../store/AppearanceContext'
import { useToast } from '../Toast'
import SectionTitle from './SectionTitle'

export default function AppearanceSection() {
  const { glassMode, setGlassMode } = useAppearance()
  const toast = useToast()

  return (
    <section id="sec-appearance" className="scroll-mt-24">
      <SectionTitle title="外观" desc="切换书签库的界面风格，偏好保存在本浏览器。" />
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
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
                  : 'border-line bg-white hover:border-line2'
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
      </div>
    </section>
  )
}
