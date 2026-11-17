import { Plus, Upload } from 'lucide-react'

interface EmptyFirstRunProps {
  onAdd: () => void
  onImport: () => void
}

/**
 * 首次使用的空状态：书架还空着，狗蛋先坐在旁边等第一枚书签。
 *
 * 和 EmptyState（通用空状态）分开的原因：
 * 「一条书签都没有」是产品第一次和用户见面，值得画一幅画；
 * 而「筛选之后没结果」只是当前视图没有匹配项，安静留白就够了，
 * 同一个通用空状态继续服务后者。
 *
 * 画面只用项目既有的 CSS 变量上色（不写死 hex），深色主题自动成立。
 * 动效全部是 CSS 动画：入场之后进入很轻的 idle 循环，
 * 不弹跳、不发光、不进粒子；reduced-motion 下停在「书签已落地」的一帧。
 */
export default function EmptyFirstRun({ onAdd, onImport }: EmptyFirstRunProps) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center sm:py-16">
      {/* 组件内样式：不碰全局 index.css。类名统一 efr- 前缀，避免和别处撞。 */}
      <style>{`
        .efr-shelf { fill: var(--surface-2); stroke: var(--line); }
        .efr-card { fill: var(--surface-2); stroke: var(--line-2); }
        .efr-shadow { fill: var(--line); }
        .efr-dot { fill: var(--accent); }
        .efr-dog-shape { fill: var(--accent-soft); stroke: var(--accent); }
        .efr-accent-stroke { stroke: var(--accent); }
        .efr-line-stroke { stroke: var(--line); }
        .efr-ink-stroke { stroke: var(--ink); }
        .efr-ink-fill { fill: var(--ink); }
        .efr-blush { fill: var(--accent); }

        /* 入场：书签从上方落下，小狗晚 200ms 淡入并上浮 6px */
        .efr-card-in {
          animation: efr-card-fall 600ms var(--ease-out) both;
          transform-box: view-box;
          transform-origin: 86px 93px;
        }
        .efr-dog-in {
          animation: efr-dog-rise 600ms var(--ease-out) 200ms both;
        }

        /* idle：书签 3s 浮动并轻微转动（≤2°）；尾巴 2.4s 轻摇；4s 眨一次眼 */
        .efr-card-idle {
          animation: efr-card-float 3s ease-in-out 600ms infinite;
          transform-box: view-box;
          transform-origin: 86px 93px;
        }
        /* 书签浮起来时脚下的影子跟着收一点，浮动才有重量感 */
        .efr-card-shadow {
          animation: efr-card-shadow 3s ease-in-out 600ms infinite;
          transform-box: view-box;
          transform-origin: 86px 118px;
        }
        .efr-tail {
          animation: efr-tail-sway 2.4s ease-in-out 800ms infinite;
          transform-box: view-box;
          transform-origin: 188px 101px;
        }
        .efr-eye {
          animation: efr-blink 4s ease-in-out 1.2s infinite;
          transform-box: view-box;
          transform-origin: 159.6px 57px;
        }

        /* 悬停小狗时尾巴摆速翻倍。只改速度，不加速度感 —— 狗蛋还是慢吞吞的。 */
        .efr-dog:hover .efr-tail { animation-duration: 1.2s; }

        @keyframes efr-card-fall {
          from { opacity: 0; transform: translateY(-26px) rotate(-8deg); }
          to { opacity: 1; transform: translateY(0) rotate(-2deg); }
        }
        @keyframes efr-card-float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-4px) rotate(1.5deg); }
        }
        @keyframes efr-card-shadow {
          0%, 100% { transform: scaleX(1); opacity: 0.4; }
          50% { transform: scaleX(0.88); opacity: 0.26; }
        }
        @keyframes efr-dog-rise {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes efr-tail-sway {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
        @keyframes efr-blink {
          0%, 82%, 100% { transform: scaleY(1); }
          86% { transform: scaleY(0.16); }
          90% { transform: scaleY(1); }
        }

        /* 减少动态：停在书签已经落地、狗蛋安安静静坐好的一帧。
           全局 reduce 规则会把时长压到 0.01ms，这里把动画整个摘掉，
           免得 4s 眨眼之类被打成一闪而过的帧。 */
        @media (prefers-reduced-motion: reduce) {
          .efr-card-in, .efr-card-idle, .efr-card-shadow, .efr-dog-in, .efr-tail, .efr-eye {
            animation: none !important;
          }
        }
      `}</style>

      <svg
        className="efr-svg w-full max-w-[280px] select-none sm:max-w-[300px]"
        viewBox="0 0 220 150"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* 小书架隔板 + 底下一条很淡的地平线 */}
        <rect
          x="24"
          y="117.5"
          width="172"
          height="7"
          rx="3.5"
          className="efr-shelf"
          strokeWidth="1.2"
        />
        <path
          d="M34 128.5h152"
          className="efr-line-stroke"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* 接触阴影：书签与小狗脚下的落点，让它们真的「站在」书架上 */}
        <ellipse cx="86" cy="118" rx="19" ry="2.4" className="efr-shadow efr-card-shadow" opacity="0.4" />
        <ellipse cx="167" cy="118.5" rx="24" ry="3" className="efr-shadow" opacity="0.5" />

        {/* 书签：外层负责落下，内层负责落地后的浮动，两层动画互不打架 */}
        <g className="efr-card-in">
          <g className="efr-card-idle">
            <path
              d="M78 68h15a5 5 0 0 1 5 5v43l-12.5-5L73 116V73a5 5 0 0 1 5-5Z"
              className="efr-card"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <circle cx="86" cy="76" r="2.2" className="efr-dot" opacity="0.9" />
            <circle cx="86" cy="82" r="1.3" className="efr-dot" opacity="0.35" />
          </g>
        </g>

        {/* 狗蛋：侧坐在书架右端，头朝书签，闭眼微笑 */}
        <g className="efr-dog efr-dog-in">
          {/* 悬停热区：只为了把尾巴热区从「几根细线」扩到整只狗 */}
          <rect x="143" y="42" width="66" height="80" fill="transparent" pointerEvents="all" />

          {/* 卷尾（先画，压在身体后面） */}
          <g className="efr-tail">
            <path
              d="M188 102c9-3 15-11 13-19-2-6-9-7-11-2-2 5 3 8 6 4"
              className="efr-accent-stroke"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* 头 + 身体一整条轮廓：坐姿的胸、背、后腿用一条线连下来 */}
          <path
            d="M168 40C178 40 186 48 186 58c0 8-3 14-8 18 9 6 12 15 12 25 0 9-2 14-4 17H148c-3-6-4-13-3-20 1-9 5-17 11-23-5-2-8-5-9.5-6.5-2.5-1-4-2-4.5-3.5-.5-1.5.5-3.5 2.5-4.5 2-1 3.5-2 4.5-3.5 3-8 10-17 19-17Z"
            className="efr-dog-shape"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* 后腿 / 前腿：只用极淡的两笔暗示结构，不做阴影 */}
          <path
            d="M180 94c6 5 8 14 7 24M150 103c-1 6-1 11 0 15"
            className="efr-accent-stroke"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.35"
          />

          {/* 垂耳 */}
          <path
            d="M174 42c6-1 11 3 12 10 2 8 1 15-2 19-2 3-6 2-8-2-2-4-3-10-3-16 0-4 0-8 1-11Z"
            className="efr-dog-shape"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M176 49c3 5 4 12 2 18"
            className="efr-accent-stroke"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* 闭眼 + 腮红 + 微笑 + 鼻头 */}
          <g className="efr-eye">
            <path
              d="M156 56q3.6 3.6 7.2 0"
              className="efr-ink-stroke"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </g>
          <ellipse cx="166" cy="64" rx="4" ry="2.2" className="efr-blush" opacity="0.16" />
          <path
            d="M143.5 66.4q2.4 2 4.8 0.6"
            className="efr-ink-stroke"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <ellipse cx="142.6" cy="63.4" rx="2.4" ry="2.1" className="efr-ink-fill" />
          <path
            d="M158 77.5c7 3.5 14 3.5 21 0.5"
            className="efr-accent-stroke"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx="169.5" cy="80.6" r="1.8" className="efr-dot" />
        </g>
      </svg>

      <p className="mt-3 text-[17px] font-semibold text-ink">书架还空着，狗蛋在等你</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-ink3">
        把想留住的链接放进来就行，标题和图标会自动补全。也可以导入浏览器里攒下的书签。
      </p>

      <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-3">
        <button
          onClick={onAdd}
          className="liquid-glass liquid-glass--accent inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl px-5 text-[14px] font-semibold text-white"
        >
          <Plus size={16} strokeWidth={2.4} />
          添加第一个书签
        </button>
        <button
          onClick={onImport}
          className="liquid-glass liquid-glass--control inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl px-5 text-[14px] font-medium text-ink2"
        >
          <Upload size={15} />
          导入浏览器书签
        </button>
      </div>
    </div>
  )
}