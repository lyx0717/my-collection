import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import DockBar from '../components/DockBar'
import BookCover from '../effects/book-card/BookCover'
import DockCover from '../effects/dock/DockCover'
import ToggleStage from '../effects/glass-toggle/ToggleStage'
import { EFFECTS, type EffectMeta } from '../effects/meta'
import '../effects/effects.css'

/**
 * 设计特效总览。
 *
 * 卡片封面就是详情页舞台的首帧：光影开关直接挂载真实组件，
 * Dock 用场景的 t=4.0s 首帧，书页卡片用真实的 280×280 卡片，
 * 悬停卡片时分别继续走时间 / 翻开。
 */
export default function EffectsPage() {
  return (
    <div className="min-h-dvh fx">
      <DockBar />
      <div aria-hidden className="h-14" />

      <main className="mx-auto max-w-[1160px] px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="fx-kicker">Design Lab · 001—{String(EFFECTS.length).padStart(3, '0')}</p>
            <h1 className="mt-3 text-[32px] leading-none font-semibold tracking-[-0.03em] text-ink sm:text-[38px]">
              设计特效
            </h1>
            <p className="mt-4 max-w-[520px] text-[14px] leading-6 text-ink2">
              把界面里真实跑着的交互单独搬出来。点开一张卡片，可以上手玩，
              也可以看它是怎么做出来的。
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-[11px] tracking-[0.16em] text-ink4">COLLECTION</p>
            <p className="mt-2 text-[13px] text-ink2">
              {EFFECTS.length} 个特效
              <span className="mx-2 text-ink4">/</span>
              {EFFECTS.filter((e) => e.status === 'ready').length} 个可交互
            </p>
          </div>
        </header>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 sm:mt-12">
          {EFFECTS.map((effect) => (
            <EffectCard key={effect.id} effect={effect} />
          ))}
        </div>

        <p className="mt-10 text-[12px] leading-5 text-ink4">
          舞台会跟随站点的明暗主题；光影开关在没有 WebGL2 的浏览器里会退回普通开关。
        </p>
      </main>
    </div>
  )
}

function EffectCard({ effect }: { effect: EffectMeta }) {
  const [hovering, setHovering] = useState(false)
  const ready = effect.status === 'ready'

  return (
    <article
      className={`fx-card${ready ? '' : ' fx-card--wip'}`}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      <div className="fx-card__cover">
        {effect.id === 'glass-toggle' ? (
          <ToggleStage compact />
        ) : effect.id === 'book-card' ? (
          <BookCover active={hovering} />
        ) : (
          <DockCover active={hovering} />
        )}
      </div>

      {ready ? (
        <Link
          to={`/effects/${effect.id}`}
          className="fx-card__hit"
          aria-label={`查看 ${effect.zh} 详情`}
        />
      ) : null}

      <div className="fx-card__body">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-[19px] font-semibold tracking-[-0.01em] text-ink">
              {effect.zh}
            </h2>
            <p className="fx-card__en">{effect.en}</p>
          </div>
          {ready ? (
            <span className="fx-card__arrow">
              <ArrowUpRight size={15} />
            </span>
          ) : (
            <span className="fx-card__tag fx-card__status">制作中</span>
          )}
        </div>

        <p className="mt-3 text-[13.5px] leading-6 text-ink2">{effect.desc}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {effect.tags.map((tag) => (
            <span key={tag} className="fx-card__tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}