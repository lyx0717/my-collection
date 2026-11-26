import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Copy, MousePointerClick } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import DockBar from '../components/DockBar'
import BookCardDetail from '../effects/book-card/BookCardDetail'
import DockDetail from '../effects/dock/DockDetail'
import { useToast } from '../components/Toast'
import ToggleStage from '../effects/glass-toggle/ToggleStage'
import { EFFECTS, getEffect } from '../effects/meta'
import { useAppearance } from '../store/AppearanceContext'
import type { ThemeMode } from '../lib/appearance'
import '../effects/effects.css'

const PROMPT = `做一个 432×224 的液态玻璃明暗开关，作为网页的昼夜切换控件。
轨道内是像素化的太阳/月亮矩阵，玻璃旋钮用圆角方框 SDF 做倒角折射、色散和边缘高光；轨道外沿一圈 LED 灯带，拨动时灯带绕着玻璃转，光会洒到轨道和页面上。
点击或左右拖拽切换；键盘可聚焦后用空格/回车。WebGL2 实时渲染，无图片，全部 shader 绘制。拨动后整个页面的明暗主题跟着变。`

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]

/**
 * 特效详情。
 *
 * Dock / 书页卡片各自有独立详情页；其余未知 id 回总览。
 * 右侧栏把「能怎么玩」和「它是什么」放在一起，主题分段控件直接改全局主题。
 */
export default function EffectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { theme, setTheme } = useAppearance()
  const [copied, setCopied] = useState(false)

  const effect = getEffect(id)

  useEffect(() => {
    if (!effect) return
    const prev = document.title
    document.title = `${effect.zh} · 设计特效`
    return () => {
      document.title = prev
    }
  }, [effect])

  if (!effect) return <Navigate to="/effects" replace />

  if (effect.id === 'dock') return <DockDetail />

  if (effect.id === 'book-card') return <BookCardDetail />

  if (effect.status !== 'ready') {
    return (
      <div className="min-h-dvh fx">
        <DockBar />
        <div aria-hidden className="h-14" />
        <main className="mx-auto max-w-[560px] px-4 pt-24 text-center sm:px-6">
          <p className="fx-kicker">002 / 制作中</p>
          <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.02em] text-ink">
            这个特效还在打磨
          </h1>
          <p className="mt-4 text-[14px] leading-6 text-ink2">
            舞台已经在画了，还没到能完整播十秒的程度。先回总览看看别的。
          </p>
          <button
            type="button"
            onClick={() => navigate('/effects')}
            className="liquid-glass liquid-glass--control mt-8 rounded-full px-5 py-2.5 text-[13px] font-medium text-ink"
          >
            返回全部特效
          </button>
        </main>
      </div>
    )
  }

  const themeLabel =
    theme === 'system' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT)
      setCopied(true)
      toast('提示词已复制', 'ok')
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast('复制失败，浏览器没给剪贴板权限', 'err')
    }
  }

  return (
    <div className="min-h-dvh fx">
      <DockBar />
      <div aria-hidden className="h-14" />

      <main className="mx-auto max-w-[1180px] px-4 pt-7 pb-24 sm:px-6 sm:pt-9">
        <Link to="/effects" className="fx-link text-[12px]">
          <ArrowLeft size={14} />
          全部特效
        </Link>

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)] lg:gap-14">
          <section className="mx-auto w-full max-w-[640px]">
            <div className="fx-detail__stage">
              {effect.id === 'glass-toggle' ? <ToggleStage /> : null}
            </div>
            <div className="fx-detail__caption">
              <span>舞台 4:5 · 实时</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                可交互
              </span>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24">
            <p className="fx-kicker">
              {effect.index} · 交互 / 材质
            </p>
            <h1 className="mt-3 text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink sm:text-[40px]">
              {effect.zh}
            </h1>
            <p className="mt-2 text-[12px] tracking-[0.12em] text-ink3 uppercase">
              {effect.en}
            </p>

            <div className="mt-5 space-y-3 text-[14px] leading-7 text-ink2">
              <p>
                顶栏右上角那颗开关，被放大成舞台中央的一块玻璃。玻璃棱边把
                底下的像素太阳、月亮折射成彩色；轨道外沿一圈 LED 跟着拨动方向
                绕行，光会洒到轨道和台面上。
              </p>
              <p>
                它不是截图，也不是视频 —— 就是设置页里那颗组件本身。
                点一下，整站换主题。
              </p>
            </div>

            <div className="fx-panel mt-7 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-medium text-ink">页面主题</h2>
                <span className="text-[11px] text-ink4">当前 {themeLabel}</span>
              </div>
              <div className="fx-seg mt-3">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={theme === option.value}
                    onClick={() => setTheme(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] leading-5 text-ink3">
                切换会同步到顶栏、设置页和整站；玻璃开关会自己拨到对应的一侧。
              </p>
            </div>

            <div className="fx-panel mt-4 p-5">
              <h2 className="text-[13px] font-medium text-ink">上手方式</h2>
              <ul className="mt-3 space-y-2.5 text-[12.5px] leading-5 text-ink2">
                <li className="flex gap-2.5">
                  <MousePointerClick size={14} className="mt-0.5 shrink-0 text-ink4" />
                  点按玻璃：拨到另一侧，整站跟着换主题。
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 w-[14px] shrink-0 text-center text-[10px] text-ink4">
                    ↔
                  </span>
                  左右拖拽：松手后按速度回弹，玻璃会短暂拉长。
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 w-[14px] shrink-0 text-center text-[10px] text-ink4">
                    ⌨
                  </span>
                  Tab 聚焦后按空格 / 回车，也可以切换。
                </li>
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={copyPrompt}
                className="liquid-glass liquid-glass--control inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium text-ink2 hover:text-ink"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '已复制' : '复制提示词'}
              </button>
              {effect.where ? (
                <Link
                  to={effect.where.to}
                  className="liquid-glass liquid-glass--control inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium text-ink2 no-underline hover:text-ink"
                >
                  {effect.where.label}
                  <ArrowUpRight size={13} />
                </Link>
              ) : null}
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-5 text-[11.5px]">
              <div>
                <dt className="text-ink4">技术</dt>
                <dd className="mt-1 text-ink2">WebGL2 / 单画布</dd>
              </div>
              <div>
                <dt className="text-ink4">设计稿</dt>
                <dd className="mt-1 text-ink2">432 × 224</dd>
              </div>
              <div>
                <dt className="text-ink4">交互</dt>
                <dd className="mt-1 text-ink2">点按 · 拖拽 · 键盘</dd>
              </div>
              <div>
                <dt className="text-ink4">降级</dt>
                <dd className="mt-1 text-ink2">无 WebGL2 退回按钮</dd>
              </div>
            </dl>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-4 text-[12px]">
              <span className="text-ink4">下一个</span>
              <Link to="/effects/dock" className="fx-link text-[12px]">
                {EFFECTS.find((e) => e.id === 'dock')?.zh ?? '桌面 Dock'}
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}