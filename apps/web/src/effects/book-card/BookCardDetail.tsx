import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Copy, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import DockBar from '../../components/DockBar'
import { useToast } from '../../components/Toast'
import { EFFECTS } from '../meta'
import BookStage from './BookStage'
import type { BookHinge, BookMotion } from './BookCard'

const PROMPT = `做一个「书页卡片」交互：卡片平时和普通产品卡完全一样，鼠标悬停或键盘聚焦时，封面像精装书一样沿着书脊翻开，后面 4 张纸按扇形逐层跟出。
- 封面保留现有卡片内容：48px 图标块、右上角箭头、标题、描述、分隔线下的元信息。
- 层序：封面 → 4 张纸 → 背板；封面角度 42°，第 n 层角度 = 42 × 0.7^n，延迟 28ms × n；合上时反向延迟。
- 所有层用 preserve-3d，transform-origin 在书脊；只动 transform 和 opacity。
- 阴影用两块预先模糊好的实色形状（接触 + 环境），翻开时与更长更软的第二组交叉淡入，绝不用 box-shadow。
- 纸页从书脊往外的暗部渐变，透明度按前一层与本层的角度差计算。
- 悬停/聚焦才打开；触屏按住打开；减弱动态时只抬起 2px。`

const INTENSITIES = [
  { value: 24, label: '轻微 24°' },
  { value: 42, label: '书页 42°' },
  { value: 60, label: '夸张 60°' },
]
const PAGE_COUNTS = [2, 3, 4, 6]
const HINGES: { value: BookHinge; label: string }[] = [
  { value: 'left', label: '左翻' },
  { value: 'right', label: '右翻' },
  { value: 'top', label: '上翻' },
]
const SHADOWS = [
  { value: 0, label: '无' },
  { value: 0.5, label: '轻' },
  { value: 1, label: '正常' },
  { value: 1.4, label: '深' },
]
const MOTIONS: { value: BookMotion; label: string }[] = [
  { value: 'snappy', label: '清脆' },
  { value: 'default', label: '默认' },
  { value: 'soft', label: '柔和' },
]

/**
 * 书页卡片详情。
 * 左舞台是四张真实的 280×280 卡片（不是截图），右栏可改角度 / 页数 / 书脊 /
 * 阴影强度 / 回弹手感，所有卡片即时跟着变。
 */
export default function BookCardDetail() {
  const toast = useToast()
  const [angle, setAngle] = useState(42)
  const [pages, setPages] = useState(4)
  const [hinge, setHinge] = useState<BookHinge>('left')
  const [shadow, setShadow] = useState(1)
  const [motion, setMotion] = useState<BookMotion>('default')
  const [allOpen, setAllOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const prev = document.title
    document.title = '书页卡片 · 设计特效'
    return () => {
      document.title = prev
    }
  }, [])

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

  function reset() {
    setAngle(42)
    setPages(4)
    setHinge('left')
    setShadow(1)
    setMotion('default')
    setAllOpen(false)
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
            <BookStage
              angle={angle}
              pages={pages}
              hinge={hinge}
              shadow={shadow}
              motion={motion}
              allOpen={allOpen}
              onActivate={() => toast('这是演示卡片；真实卡片会打开对应页面', 'ok')}
            />
            <div className="fx-detail__caption">
              <span>舞台 4:5 · 实时</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                可交互
              </span>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24">
            <p className="fx-kicker">003 · 交互 / CSS 3D</p>
            <h1 className="mt-3 text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink sm:text-[40px]">
              书页卡片
            </h1>
            <p className="mt-2 text-[12px] tracking-[0.12em] text-ink3 uppercase">
              Book Card
            </p>

            <div className="mt-5 space-y-3 text-[14px] leading-7 text-ink2">
              <p>
                卡片合着的时候，和普通产品卡没有区别：一样的白面、一样的发丝边、
                一样的标题和元信息。鼠标一停，封面沿书脊翻开，四张纸跟着扇形展开。
              </p>
              <p>
                所有层都活在同一个 preserve-3d 里，只动 transform 和 opacity；
                阴影是两组预先模糊好的形状，跟着翻页进度交叉淡入。
              </p>
            </div>

            <div className="fx-panel mt-7 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-medium text-ink">翻开参数</h2>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 text-[11px] text-ink3 hover:text-ink"
                >
                  <RotateCcw size={12} />
                  重置
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-[11px] text-ink4">翻开角度</p>
                  <div className="fx-seg">
                    {INTENSITIES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={angle === item.value}
                        onClick={() => setAngle(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-ink4">纸页数量</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PAGE_COUNTS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        className="fx-chip"
                        aria-pressed={pages === count}
                        onClick={() => setPages(count)}
                      >
                        {count} 页
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] text-ink4">书脊位置</p>
                  <div className="fx-seg">
                    {HINGES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={hinge === item.value}
                        onClick={() => setHinge(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-ink4">阴影强度</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SHADOWS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="fx-chip"
                        aria-pressed={shadow === item.value}
                        onClick={() => setShadow(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-ink4">回弹手感</span>
                  <div className="flex flex-wrap gap-1.5">
                    {MOTIONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className="fx-chip"
                        aria-pressed={motion === item.value}
                        onClick={() => setMotion(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="fx-chip w-full justify-center"
                  aria-pressed={allOpen}
                  onClick={() => setAllOpen((value) => !value)}
                >
                  {allOpen ? '全部合上' : '全部翻开'}
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-2 rounded-[18px] border border-line p-4">
              <p className="text-[12px] font-medium text-ink">上手方式</p>
              <p className="text-[12px] leading-6 text-ink2">
                鼠标悬停任一张卡，或用 Tab 键移到卡片上；触屏按住即可翻开。
                舞台里的卡片都是真的 DOM，不是录屏。
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyPrompt}
                className="liquid-glass liquid-glass--control inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12.5px] text-ink"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '已复制' : '复制提示词'}
              </button>
            </div>

            <dl className="mt-8 space-y-3 border-t border-line pt-6 text-[12px]">
              {[
                ['实现', 'DOM + CSS 3D / preserve-3d'],
                ['层级', '封面 + 4 页 + 背板'],
                ['默认', '42° · 28ms 逐层 · 左书脊'],
                ['性能', '仅 transform / opacity'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <dt className="text-ink4">{label}</dt>
                  <dd className="text-right text-ink2">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex items-center justify-between border-t border-line pt-5 text-[12px]">
              <span className="text-ink4">下一个</span>
              <Link to="/effects/glass-toggle" className="fx-link text-[12px]">
                {EFFECTS.find((effect) => effect.id === 'glass-toggle')?.zh ?? '光影开关'}
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
