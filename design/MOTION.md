# my-collection 动效方案（motion）

> 决策（2026-10-09）：基调「轻快流畅」；场景全覆盖（视图切换 / 进场 stagger / 拖拽反馈 / hover 微交互）；技术路线引入 **motion v14**；**不加设置页开关**，只跟随系统 `prefers-reduced-motion`。
> 现状：只有一次性入场 keyframes（`animate-pop` / `animate-rise` / `animate-drawer` / `animate-fade-in`）+ 18 处 hover 变色过渡，**视图切换是瞬时硬切、拖拽只做了位移、无 stagger**，故体感「动效弱」。

> **基线已二次调校（2026-10-10）**：初版上线后反馈「动画有点傻快，不够优雅」。根因不是时长本身，而是 **expo-out 曲线**——实测它只用 13% 的时间就走完一半位移，位移永远是「啪」一下到位再长时间僵住。处理方式：换成柔和 S 型曲线（半程耗时拉到 29%）+ 时长整体放慢约 55% + 位移幅度收小。下表为调校后的最终值。

## 1. 动效基线（先定标尺，再写代码）

一切动效只能用这张表里的值，不允许随手写 `300ms ease`。

| Token | 值 | 用途 |
|---|---|---|
| `--dur-1` | 200ms | 微反馈：按下、图标切换 |
| `--dur-2` | 320ms | 默认：hover 位移、chip 选中、分段控件滑块、星标显隐 |
| `--dur-3` | 450ms | 弹窗、抽屉、**视图切换** |
| `--dur-4` | 600ms | 拖拽落位回弹、进场单项 |
| `--ease-out` | `cubic-bezier(0.30, 0.12, 0.20, 1)` | **主力**：一切「进入」（上移淡入、弹窗、抽屉） |
| `--ease-in-out` | `cubic-bezier(0.45, 0.05, 0.35, 1)` | 位置互换（视图切换、拖拽落位） |
| `--ease-soft` | `cubic-bezier(0.34, 0.14, 0.22, 1)` | 微反馈专用：比 `out` 再柔一档，用于星标弹动 |
| spring 落位 | `stiffness 260 / damping 30 / mass 1` | 拖拽放手后的回弹（沉回原位，不弹射） |
| spring 跟手 | `stiffness 520 / damping 42` | 拖拽中的浮起跟随 |
| 错峰 | `step 34ms`，上限 12 项 | 一波铺开「依次浮现」，而非整块弹 |
| 位移幅度 | 6px（进场）/ 1.5px（hover） | 小幅度 + 长时长 = 优雅；大幅度 + 短时长 = 廉价 |
| 缩放幅度 | `0.985 → 1`（弹窗）、`1 → 1.015`（拖拽浮起）、`1 → 1.12`（星标） | 一律不超过 1.02（星标除外） |

**曲线选择的判据**（可复用的量化方法）：把时间轴十等分，看每等分完成多少位移。线性 = 每档 25%；`expo-out` 在 20% 时间就完成 67%——这就是「傻快」；理想区间是前 10% 只走 8%~19%，半程耗时落在 28%~35%。调新曲线时用这个方法验，不要凭手感。

**只用 transform 与 opacity**：`left/top/width/height` 动画一律走 FLIP（motion 的 `layout`），`box-shadow` 不做连续插值（低端机掉帧），改用两层预置阴影 + opacity 交叉淡入。

## 2. 关键机制：MotionConfig reducedMotion="user"（必须做）

现有 CSS 兜底（`index.css` 的 `@media (prefers-reduced-motion: reduce)`）**对 motion 无效**——motion 走 rAF 驱动 JS 动画，不走 CSS transition。必须用：

```tsx
// main.tsx 根节点包一层，系统开启「减少动态」时 motion 自动把 transform 动画降级为纯不透明度
<MotionConfig reducedMotion="user">{children}</MotionConfig>
```

这一行替代了「设置页加开关」的方案（用户已定：只跟系统）。另需在 `src/index.css` 补一条：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
（现有规则保留，但把 `transition-duration` 也纳入，避免 hover 位移残留。）

## 3. 场景实现

### 3.1 视图切换（痛感最强，优先做）
`HomePage.tsx` 列表 / 网格 / 磁贴三视图目前硬切。

- 外层 `<LayoutGroup>` + 切换时给容器加 `key={view}`，配合 `AnimatePresence mode="popLayout" initial={false}`。
- 容器本身 `layout`，子项 `layout="position"`——**不做尺寸动画**，只让坐标平滑互换（尺寸差异由进入/退出项交叉淡入承担），这是不抖动的前提。
- 同一书签跨视图做连续 morph：给书签项 `layoutId={`bm-${id}`}`，列表→网格时图标从圆形头像飞到方形封面，这类细节最能体现「优雅」。
- 切出项：`exit={{ opacity: 0, scale: 0.98 }}` 180ms；切入项 240ms `--ease-out`。

### 3.2 进场 stagger
- 父容器 `variants` 编排 `staggerChildren: 0.02`，子项 `from { opacity: 0, y: 8 }` 320ms `--ease-out`。
- **只在视图切换 / 首次挂载播**，筛选与排序变化只走 layout 位移，不重播入场（否则每次输入都闪一遍）。
- 上限：`stagger` 对前 14 项生效，磁贴视图超过 12 项直接不 stagger（一次动十几块会晕）。

### 3.3 拖拽反馈
`SortableBookmarks.tsx` 目前只有位移：

- `DragOverlay` 渲染拖起项副本：`scale 1.02 + rotate 0.6deg + shadow-lg + cursor-grabbing`，跟手；跟手位移用 `spring(stiffness 700, damping 40)`（跟手要跟手，不能有延迟感）。
- 原项 `opacity 0.32 + scale 0.98`。
- **其余项让位**：`motion.li layout` 平滑补位（这是 dnd-kit 与 motion 配合的关键收益）。
- 落位：放手后 `spring(420/34)` 回弹一次，不做「弹两下」的弹跳。
- 键盘拖拽（Space 抓取）给同一套反馈，别只做鼠标。

### 3.4 hover 微交互
- 行/网格卡/磁贴：`hover: y -2px` + 阴影加深（120–180ms，`--ease-out`）。**建议继续用 CSS transition 而非 motion**——hover 是最高频交互，CSS 走合成层更省。
- 星标：`whileTap scale 0.86` + 收藏成功 `scale 1 → 1.25 → 1` 220ms（`--dur-2`）。
- 计数/统计数字：motion `useSpring` + `useTransform` 做 320ms 数字滚动（收藏数、标签数、备份条目数）。
- 输入框聚焦：光环 `box-shadow` 从 0 → `var(--accent-ring)` 180ms。

### 3.5 顺带补：主题/玻璃切换
`data-theme` / `data-glass` 切换目前瞬时。给根元素加 `background-color / color / border-color 200ms` 过渡（`--ease-in-out`），并给 `backdrop-filter` 加 200ms——切玻璃时像「雾化」而不是开关。

## 4. 改造清单

| 文件 | 动作 |
|---|---|
| `package.json` | 新增 `motion@^14`（唯一新依赖） |
| `src/main.tsx` | 根节点包 `MotionConfig reducedMotion="user"` |
| `src/index.css` | 新增 `--dur-*` / `--ease-*` 基线 token；reduced-motion 补 `transition-duration` |
| `src/lib/motion.ts`（新增） | 统一 `transition` / `variants` 常量 + `stagger()` 工具，供全站复用（唯一的动效真源） |
| `src/pages/HomePage.tsx` | `LayoutGroup` + `AnimatePresence` + 容器 `layout` + stagger 编排 |
| `src/components/BookmarkRow/GridCard/Tile.tsx` | `motion.li layout` + `layoutId` + hover（CSS） |
| `src/components/SortableBookmarks.tsx` | `DragOverlay` + 让位 layout + 落位 spring |
| `src/components/StarButton.tsx` | `whileTap` + 收藏弹动 |
| `src/components/Topbar / Sidebar / Toast / 各 Modal` | 二期：把已有 CSS keyframes 逐步交给 motion（先不动，避免一次改太多） |

## 5. 实施顺序

| Phase | 内容 | 规模 |
|---|---|---|
| 1 | 装 motion + `MotionConfig` + `src/lib/motion.ts` 基线 + CSS token + reduced-motion 补强 | ~60 行 |
| 2 | 视图切换（`LayoutGroup`/`AnimatePresence`/`layoutId`）+ 进场 stagger | ~120 行 |
| 3 | 拖拽反馈（DragOverlay + 让位 + 落位 spring + 键盘态） | ~90 行 |
| 4 | hover 微交互 + 星标弹动 + 数字滚动 + 主题/玻璃切换过渡 | ~80 行 |
| 5 | 回归验收：亮/暗 × 实心/玻璃 × 三视图；系统开 reduce-motion 再过一遍 | — |

## 6. 风险与守则

1. **layout 动画抖动**：容器 sticky（顶栏 chips `top-[62px]`）+ `layout` 易冲突 → 只用 `layout="position"`，不改尺寸。
2. **长列表性能**：>150 项时只对可视区做 layout；stagger 限 14 项、磁贴限 12 项。
3. **合成层爆炸**：`will-change` 不全局加；backdrop-filter 与 blur 动画仅玻璃态使用。
4. **阴影动画**：一律不插值，改 opacity 交叉淡入。
5. **降级一致性**：`motion.ts` 是唯一动效真源，禁止组件内散写 duration/easing。
6. **两主题都要过**：深色下阴影本就不可见，hover 反馈主要靠边框提亮，别让深色看起来「没反应」。

## 7. 验收标准

1. 三视图切换无闪烁、无跳位，同一书签图标有连续位移。
2. 首屏进场错峰可感但不拖沓（单项 ≤320ms，末项 ≤600ms 内结束）。
3. 拖拽：拿起跟手无延迟、其余项平滑让位、放手一次回弹。
4. 系统开启「减少动态」后，所有位移/缩放消失、仅剩淡入，功能不受影响。
5. 亮/暗 × 实心/玻璃四组合下均无视觉破损；长时间使用无掉帧感。
