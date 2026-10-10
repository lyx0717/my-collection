# my-collection UI 方案（当前状态）

> 2026-10-10 定稿。此前经历 v2–v7 七轮迭代，过程记录已归档至 git history 与项目记忆。

## 1. 结构

```
固定顶栏（通栏 h-14）        ← Logo / 搜索引擎(≤380px) / 设置
  ↓ 文档流垫 56px
二级导航（sticky 悬浮胶囊）   ← 首页=分组，设置页=分区，二者共用 CapsuleNav
  ↓
内容工具条                   ← 标题 / 计数 / 筛选 / 添加 / 多选 / 视图切换
内容区（max-w-6xl）
```

## 2. 视觉规范（iOS System Material）

| 项 | 浅色 | 深色 |
|---|---|---|
| backdrop 模糊 | `blur(16px) saturate(180%)` | 同 |
| 玻璃底（卡片） | `rgba(255,255,255,0.68)` | `rgba(28,28,30,0.62)` |
| 玻璃底（导航） | `rgba(255,255,255,0.82)` | `rgba(38,38,40,0.82)` |
| 描边 1px 白 | 卡片 0.7 / 导航 0.98 | 卡片 0.12 / 导航 0.2 |
| 阴影 | 卡片 0.06 / 导航 0.2 | 卡片 0.3 / 导航 0.6 |
| 圆角 | 20px | 20px |
| 底色 | `#f2f2f7` | `#000000` |
| 主色 | `#0a84ff` | `#0a84ff` |

**导航必须与卡片分档** —— 共用同一档材质就分不出层次。

## 3. 功能范围（已明确下线）

- 分组导航**只读**，增删改与拖拽排序在设置页
- 没有分组的书签归入「全部」，不单列视图
- 无星标功能、无实心/玻璃切换
- 分组图标为 lucide SVG，emoji 已全部移除

## 4. 关键实现约束

1. **fixed 顶栏之后必须补等高占位**（`<div aria-hidden className="h-14" />`），
   否则 sticky 导航的兄弟元素会与它抢位置，内容被压。
2. **Tailwind v4：兜底定位必须写进 `@layer base`** —— 无层样式优先级高于任何有层样式，
   与特异性无关；`@layer` 之外用 `:where()` 压特异性**无效**。
3. **玻璃要透**：路由容器与 body 都不能有不透明底色，否则盖住背景折射层。
4. **玻璃需要可折射内容**：纯色底 + backdrop-filter 等于模糊空转，
   body 保留一层 <6% 透明度的柔和渐变提供明暗变化。
5. 支持 `prefers-reduced-transparency`（玻璃降级实色）与 `prefers-reduced-motion`。

## 5. 文件结构

| 文件 | 职责 |
|---|---|
| `components/DockBar.tsx` | 固定顶栏（无 prop） |
| `components/CapsuleNav.tsx` | 悬浮胶囊导航，首页与设置页共用 |
| `components/GroupNav.tsx` | 分组导航，组装 CapsuleNav 的 items |
| `lib/collectionIcons.tsx` | 24 枚 lucide 候选 + `iconForCollection()` hash 分配 |
| `lib/appearance.ts` | 主题三态（无 GlassMode） |
| `hooks/useBookmarkFilter.ts` | URL 参数 → 可见列表 + 分组计数 |

## 6. 已归档的坑（详见项目记忆）

- 布局重叠**必须量 rect**（`nav.bottom` vs `h1.top`），光看截图会误判
- 改组件后必须重启 dev server，否则 vite 服务旧模块树、页面 404 白屏无报错
- macOS `sed -i ''` 转义易错，批量改样式类用 `node -e` + 正则
