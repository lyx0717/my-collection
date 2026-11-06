# my-collection 动效（现状与基线）

> 决策（2026-10-09）：基调「轻快流畅」；技术路线 **motion v14**；**不加设置页开关**，只跟随系统
> `prefers-reduced-motion`。基线二次调校（2026-10-10）：初版「傻快、不优雅」，根因是 expo-out 曲线，
> 换成柔和 S 型 + 时长放慢约 55% + 位移收小。
> **2026-11-06 复核**：下文数值与 `apps/web/src/lib/motion.ts`、`index.css` 现状逐条对齐；
> 原方案里未落地的部分单独列在 §4，别再当成已有能力。

## 1. 动效基线（唯一真源：`apps/web/src/lib/motion.ts`）

一切动效只能取这张表里的值，组件内不允许随手写 `300ms ease`。

| Token | 值 | 用途 |
|---|---|---|
| `DUR[1]` / `--dur-1` | 200ms | 微反馈：按下、图标切换 |
| `DUR[2]` / `--dur-2` | 320ms | 默认：hover 位移、chip 选中、分段滑块、弹窗退场 |
| `DUR[3]` / `--dur-3` | 450ms | **视图切换容器进场**、主题切换过渡、`animate-rise` |
| `DUR[4]` / `--dur-4` | 600ms | 进场单项、拖拽落位、数字滚动 |
| `EASE.out` / `--ease-out` | `cubic-bezier(0.30, 0.12, 0.20, 1)` | **主力**：一切「进入」 |
| `EASE.inOut` / `--ease-in-out` | `cubic-bezier(0.45, 0.05, 0.35, 1)` | 位置互换（视图切换退场、拖拽落位） |
| `EASE.soft` | `cubic-bezier(0.34, 0.14, 0.22, 1)` | 微反馈档位：比 `out` 再柔一档（已导出，**当前无调用点**；CSS 也未导出该变量） |
| 错峰 | `STAGGER_STEP 34ms`、`STAGGER_LIMIT 12` 项 | 一波铺开「依次浮现」，不是整块弹 |
| 位移幅度 | 6px（进场）/ 1.5px（hover） | 小幅度 + 长时长 = 优雅；大幅度 + 短时长 = 廉价 |
| 缩放幅度 | `0.985 → 1`（弹窗）、`1 → 1.015`（拖拽浮起） | 一律不超过 1.02 |
| 弹窗 | 遮罩 `animate-fade-in` 320ms + 面板 `animate-pop`（`y 6px` + `scale .985→1`）320ms | 走 CSS keyframes，不进 motion |
| 落位回弹 | 无 spring 常量，统一用 `DUR[4]` + `EASE.inOut` | 早期方案里的 `spring(260/30)` 等已删除 |

**曲线选择的判据**（可复用的量化方法）：把时间轴十等分，看每等分完成多少位移。
线性 = 每档 25%；`expo-out` 在 20% 时间就完成 67%——这就是「傻快」；理想区间是前 10% 只走 8%~19%，
半程耗时落在 28%~35%。调新曲线时用这个方法验，不要凭手感。

**只用 transform 与 opacity**：`left/top/width/height` 动画一律走 FLIP（motion 的 `layout`），
`box-shadow` 不做连续插值（低端机掉帧），改用两层预置阴影 + opacity 交叉淡入。

## 2. 机制

- **`main.tsx`**：`<MotionConfig reducedMotion="user">` 包根节点 —— 系统开「减少动态」时，motion 自动把
  位移/缩放降级为纯不透明度，功能不受影响。另用 `<LazyMotion features={domAnimation} strict>` 按需加载，
  避免把 motion 全量 runtime 打进产物。
- **CSS 兜底**（`index.css`）：`@media (prefers-reduced-motion: reduce)` 把 `animation-duration` 与
  `transition-duration` 一起压到 `0.01ms` —— 光压 animation 会漏掉 hover 过渡。
- 组件内禁止散写 duration/easing，统一从 `lib/motion.ts` 取。

## 3. 已实现的场景

### 3.1 视图切换（列表 / 网格 / 磁贴）
- 容器 `<m>` 用 `viewContainer`：进场 `opacity 0→1` 450ms `EASE.out`；退场 320ms `EASE.inOut`
  （退场比进场快，切换时不拖尾）。
- 外层 `<AnimatePresence mode="popLayout">` —— 退出项先脱离文档流，避免新视图被旧视图挤一下。
- 子项用 `itemEnter`，自定义 `index` 驱动错峰：`y 6px → 0`、600ms、间隔 34ms、上限 12 项。
- 视图切换指示器（分段控件）用 `layoutId="view-pill"` 做滑块连续位移，这是全站唯一用了 `layoutId` 的地方。

### 3.2 拖拽（仅列表视图）
- `DragOverlay` 渲染拖起项副本：`scale(1.015) rotate(0.35deg)` + `cursor-grabbing`，跟手无延迟。
- 落位：`dropAnimation={{ duration: 600, easing: cubic-bezier(.45,.05,.35,1) }}` —— 回弹一次，不弹两下。
- 原项 `opacity-60` + 加重阴影 + `ring-2 ring-accent/40`；其余项让位交给 dnd-kit 的 `useSortable`
  自带的 transform/transition（不用 motion 的 `layout`，两套 transform 会打架）。
- 鼠标与键盘（`KeyboardSensor` + `sortableKeyboardCoordinates`）同一套反馈。

### 3.3 hover / 数字 / 主题
- 行/卡/磁贴：**CSS 过渡**，`transition-[transform,box-shadow,border-color] var(--dur-2) var(--ease-out)`，
  `hover:-translate-y-[1.5px]` + 阴影加深。hover 是最高频交互，走合成层比走 JS 便宜。
- 数字滚动：`CountUp.tsx` 用 `useSpring(duration: 600ms, bounce: 0)`。
- 主题切换：`html` 上对 `background-color / color / border-color / backdrop-filter` 做
  `var(--dur-3) var(--ease-in-out)` 过渡，切主题是渐变而不是闪断。
- 残余的一次性 CSS keyframes 只剩三个：`animate-fade-in`（320ms）、`animate-rise`（450ms）、
  `animate-pop`（320ms）；`animate-drawer` 已随抽屉一起删除。

## 4. 没做的（原方案里有、现在没有）

- **跨视图的 `layoutId` morph**（同一书签从列表圆头像飞到网格方封面）—— 只有指示器用了 `layoutId`，
  书签项之间没有连续位移。
- **`LayoutGroup` + `layout="position"` 的坐标互换** —— 视图切换靠容器淡入淡出承担，不做位置 morph。
- **筛选/排序时的 layout 位移** —— 目前筛选直接重绘并重播进场错峰；书签多时会有「闪一下」的观感。
- 星标弹动、玻璃/实心切换过渡：对应功能已下线（无星标，开关不存在），不再计划。

## 5. 验收标准

1. 三视图切换无白闪、无跳位；切回同一视图时列表顺序不丢。
2. 首屏进场错峰可感但不拖沓：单项 600ms 内到位，第 12 项之后不再叠加延迟。
3. 拖拽：拿起跟手无延迟、放手只回弹一次、松手后顺序落到新位置并持久化。
4. 系统开启「减少动态」后，所有位移/缩放消失、只剩淡入，功能不受影响。
5. 亮色 / 深色两套主题下均无视觉破损；长列表滚动无掉帧感。