# my-collection UI 方案（当前状态）

> 2026-10-10 定稿；**2026-11-06 按 `apps/web/src/index.css` 现状复核**（卡片改实底、模糊 16px→10px、
> 导航透明度下调、视图权限收敛）。此前经历 v2–v7 七轮迭代，过程记录已归档至 git history 与项目记忆。
> 本文数值与 `index.css` 冲突时，以 `index.css` 为准。

## 1. 结构

```
固定顶栏（通栏 h-14）        ← Logo / 搜索引擎(≤380px) / 设置
  ↓ 文档流垫 56px
二级导航（sticky 悬浮胶囊）   ← 首页=分组，设置页=文字分段
  ↓
内容工具条                   ← 标题 / 计数 / 筛选 / 添加 / 多选 / 视图切换
内容区（max-w-6xl）
```

## 2. 视觉规范（iOS System Material）

| 项 | 浅色 | 深色 |
|---|---|---|
| 背板 `--canvas` | `#f2f2f7` | `#000000` |
| 卡片底 `--glass-bg-card` | `#ffffff`（实底） | `#1c1c1e`（实底） |
| 卡片描边 `--card-line` | `rgba(60,60,67,.09)` | `rgba(255,255,255,.18)` |
| 悬浮控件底 `--glass-bg-nav` | `rgba(255,255,255,.66)` | `rgba(30,30,32,.6)` |
| 悬浮控件描边 `--glass-border-nav` | `rgba(255,255,255,.95)` | `rgba(255,255,255,.2)` |
| 悬浮控件阴影 `--glass-shadow-nav` | `0 8px 28px -10px rgba(15,20,35,.26)` | `0 10px 30px -10px rgba(0,0,0,.7)` |
| 弹窗底 `--glass-bg-sheet` | `rgba(255,255,255,.78)` | `rgba(28,28,30,.82)` |
| backdrop 模糊 `--glass-blur` | `blur(10px) saturate(180%)`；弹窗 `--glass-blur-sheet` 24px | 同 |
| 1px 亮描边 `--glass-border` | `rgba(255,255,255,.7)` | `rgba(255,255,255,.12)` |
| 主色 `--accent` | `#0a84ff` | `#0a84ff` |
| 圆角 | 行与弹窗 20px、网格卡 16px、磁贴 12px | 同 |

**两条分层原则**

1. **导航与卡片必须分档** —— 共用同一档材质就分不出层次。导航更透、描边更亮、投影更重，
   靠体量和投影浮在内容之上；卡片靠实底 + 冷灰描边从浅灰背板上「切」出来。
2. **卡片不做 `backdrop-filter`** —— 同屏四十多张卡，每层每帧都要重采样背后内容，滚动直接掉帧。
   判断标准是「同屏实例数」：浮层（顶栏、胶囊、弹窗、Toast）同时只有一两个，配玻璃；
   卡片是成批出现，配实底。

> 这轮调整的原因：卡底曾是 68% 白 + 1px 白描边，描边与卡底合成后对比 ≈1.0:1，
> 卡片与背板只差 9 个色阶，一屏 45 张卡全靠 0.06 的阴影撑边界，扫读时眼睛得先「找边」。

## 3. 功能范围

- 分组导航**只读**，增删改与拖拽排序在设置页
- 没有分组的书签归入「全部」，不单列视图
- 无星标功能、无实心/玻璃切换（玻璃是唯一材质，只跟主题走）
- 分组图标为 lucide SVG，emoji 已全部移除
- **三视图权限不同**：列表 = 可编辑（编辑 / 删除 / 拖拽排序 / 批量操作）；
  网格与磁贴 = 纯浏览，只渲染内容与打开动作，不渲染操作按钮、也不挂拖拽把手

## 4. 关键实现约束

1. **fixed 顶栏之后必须补等高占位**（`<div aria-hidden className="h-14" />`），
   否则 sticky 导航的兄弟元素会与它抢位置，内容被压。
2. **Tailwind v4：兜底定位必须写进 `@layer base`** —— 无层样式优先级高于任何有层样式，
   与特异性无关；`@layer` 之外用 `:where()` 压特异性**无效**。
3. **玻璃面要透**：路由容器与 body 都不能有不透明底色，否则盖住背后的明暗差异。
   （只对悬浮控件成立；卡片是实底，不受这条约束。）
4. **玻璃需要可折射内容**：纯色底 + backdrop-filter 等于模糊空转，
   body 保留一层 <6% 透明度的柔和渐变提供明暗变化。
5. **玻璃底必须写 `background-color`，不能用 `background` 简写** ——
   变量里存的是裸 `rgba()`，简写会被当成 image 层的值而整条声明失效（实测 computed `backgroundImage: none`）。
6. 支持 `prefers-reduced-transparency`（玻璃降级实色）与 `prefers-reduced-motion`。

## 5. 文件结构

| 文件 | 职责 |
|---|---|
| `components/DockBar.tsx` | 固定顶栏（无 prop） |
| `components/CapsuleNav.tsx` | 悬浮胶囊导航（首页分组导航用） |
| `components/GroupNav.tsx` | 分组导航，组装 CapsuleNav 的 items |
| `lib/collectionIcons.tsx` | 24 枚 lucide 候选 + `iconForCollection()` hash 分配 |
| `lib/appearance.ts` | 主题三态（无 GlassMode） |
| `lib/bookmarklet.ts` | 书签小工具 href 生成（`#/add?u=&t=` 深链） |
| `lib/motion.ts` | 动效真源（时长、缓动、错峰、视图切换 variants） |
| `hooks/useBookmarkFilter.ts` | URL 参数 → 可见列表 + 分组计数 |

## 6. 已归档的坑（详见项目记忆）

- 布局重叠**必须量 rect**（`nav.bottom` vs `h1.top`），光看截图会误判
- 改组件后必须重启 dev server，否则 vite 服务旧模块树、页面 404 白屏无报错
- macOS `sed -i ''` 转义易错，批量改样式类用 `node -e` + 正则