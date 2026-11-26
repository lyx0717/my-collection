import GlassThemeToggle from '../../components/GlassThemeToggle'

/**
 * 光影开关的展示舞台。
 *
 * 卡片和详情页共用同一块「昼夜分割」背景，差别只在比例和元信息：
 * - card：4:3，玻璃开关 inert，整张卡片的点击由外层链接接管；
 * - detail：4:5，玻璃开关是真正可点的，点一下整站换主题。
 */
export default function ToggleStage({ compact = false }: { compact?: boolean }) {
  const inert = compact ? ({ inert: '' } as Record<string, string>) : {}

  return (
    <div className={`fx-stage${compact ? ' fx-stage--compact' : ''}`}>
      <div className="fx-stage__split" aria-hidden />
      <div className="fx-stage__beam" aria-hidden />
      <div className="fx-stage__glow fx-stage__glow--sun" aria-hidden />
      <div className="fx-stage__glow fx-stage__glow--moon" aria-hidden />
      <div className="fx-stage__grain" aria-hidden />

      <span className="fx-stage__word fx-stage__word--day" aria-hidden>
        DAY
      </span>
      <span className="fx-stage__word fx-stage__word--night" aria-hidden>
        NIGHT
      </span>

      <div className="fx-stage__meta" aria-hidden>
        <span>001</span>
        <span>GLASS / WEBGL2</span>
      </div>

      <div className="fx-stage__object" {...inert}>
        <GlassThemeToggle size="lg" />
      </div>

      <div className="fx-stage__plinth" aria-hidden />
    </div>
  )
}