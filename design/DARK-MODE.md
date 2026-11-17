# my-collection 深色模式（实现现状）

> 2026-10-08 起稿；**2026-11-06 重写为「机制 + 实测」**。原方案里的部分设想后来被删掉或从未实现
> （实心/玻璃开关、氛围光晕、星标、封面渐变变量），已挪到 §6，别再照着找。
> 真源：`apps/web/src/index.css`（`:root` / `:root[data-theme='dark']`）、`src/lib/appearance.ts`。
> 下文对比度是我按 WCAG 相对亮度从现行色值算出来的，不是"看起来还行"。

## 1. 机制

Tailwind 4 的 `@theme` 是编译期静态值，不能运行时切换。所以用双轨 CSS 变量：

```css
/* 1) 实际值挂在 :root，深色用属性选择器整体覆盖 */
:root { --canvas: #f2f2f7; --surface: #ffffff; /* …全部 token… */ }
:root[data-theme='dark'] { --canvas: #000000; --surface: #1c1c1e; /* … */ }

/* 2) @theme inline 让 utility 引用运行时变量 */
@theme inline { --color-canvas: var(--canvas); --color-surface: var(--surface); }
```

效果：`bg-canvas` / `text-ink3` 等既有 className 一个不改，
`document.documentElement.dataset.theme = 'dark'` 一行切换全站。不用 `dark:` 前缀（那要改几十个组件类名）。

**三态主题**（`lib/appearance.ts`）

- `type ThemeMode = 'light' | 'dark' | 'system'`，存 `localStorage['mybookmarks:theme']`
- `applyTheme()` 设/删 `html[data-theme]`；`system` 靠 `matchMedia('(prefers-color-scheme: dark)')`，
  并在 `change` 上挂监听即时跟随，不用重启
- `applyTheme()` 还恒挂 `html[data-glass='on']` —— 界面风格开关下线后玻璃是唯一材质，
  这个属性现在是个恒等条件，不再有"实心"分支
- **防白闪（FOUC）**：`index.html` 里 `<head>` 内的阻塞内联脚本，渲染前先按 localStorage 挂
  `data-theme`，规则与 `applyTheme` 一致；否则深色用户每次刷新先白一帧
- `<meta name="theme-color">` 两条带 media，值跟 `--canvas` 对齐（浅 `#f2f2f7` / 深 `#000000`）

## 2. 色板与实测对比度

| Token | 浅色 | 深色 | 深色对比度（canvas / surface） |
|---|---|---|---|
| canvas | `#f2f2f7` | `#000000` | — |
| surface | `#ffffff` | `#1c1c1e` | — |
| surface-2 | `#f7f7fa` | `#2c2c2e` | — |
| segment（分段控件底） | `#ececf0` | `#2c2c2e` | — |
| ink（正文） | `#1c1c1e` | `#f5f5f7` | 19.29 / 15.63 |
| ink-2（次级） | `#3a3a3c` | `#a8a8ad` | 8.87 / 7.19 |
| ink-3（说明） | `#6e6e73` | `#7d7d82` | 5.13 / 4.15 |
| ink-4（占位符 / 图标灰） | `#8e8e93` | `#636366` | 3.51 / 2.84 |
| line / line-2 | `rgba(60,60,67,.13/.2)` | `rgba(84,84,88,.5/.72)` | — |
| accent（填充 / 图标） | `#0a84ff` | `#0a84ff` | 5.76 / 4.66 |
| accent-ink（强调文字） | `#0071e3` | `#409cff` | 7.42 / 6.01 |
| danger | `#ff3b30` | `#ff453a` | 6.16 / 4.99 |
| danger-ink | `#d70015` | `#ff6961` | 7.45 / 6.03 |
| success | `#34c759` | `#30d158` | 10.39 / 8.42 |
| warn-ink | `#b26a00` | `#ffb340` | 11.77 / 9.54 |

**读数说明（别拿色值当文字色用）**

- 深色下所有文字 token 都 ≥4.15，正文 15.63 远超 7:1；浅色下 ink/ink-2 是 17.01 / 11.35，ink-3 是 5.07。
- **浅色 `ink-4` 只有 2.92（canvas）/ 3.26（surface）**，低于正文门槛 —— 它只允许出现在占位符、
  禁用态、非语义图标上；说明性文字一律用 `ink-3`。
- **`accent` / `danger` / `success` 是填充色**（按钮底、圆点、徽章），当文字用会掉到 3.2–3.6；
  需要彩色文字时用 `accent-ink` / `danger-ink` / `success-ink`（4.7 上下）。

## 3. 玻璃材质（深色）

| Token | 浅色 | 深色 |
|---|---|---|
| `--glass-bg`（顶栏 / 浮层底） | `rgba(255,255,255,.68)` | `rgba(28,28,30,.62)` |
| `--glass-bg-nav`（分组胶囊） | `rgba(255,255,255,.66)` | `rgba(30,30,32,.6)` |
| `--glass-bg-sheet`（弹窗） | `rgba(255,255,255,.78)` | `rgba(28,28,30,.82)` |
| `--glass-bg-card`（卡片，实底） | `#ffffff` | `#1c1c1e` |
| `--glass-border` | `rgba(255,255,255,.7)` | `rgba(255,255,255,.12)` |

- 深色底做成 **62%** 而不是和浅色一样的 68%：同样的 alpha 在深色上显得更薄。
- 深色的层次**不靠阴影**（黑底上阴影本来就看不见），靠「surface 比 canvas 亮一档 + 1px 白描边
  （.12–.18）」。hover 强调也从阴影改为描边提亮。
- 卡片两套主题都是**实底**，唯一区别是深色描边更亮 —— 原因见 `design/UI-PLAN.md` §2。

## 4. 域名徽章与 logo 底

- `lib/color.ts` 只返回 `var(--badge-fg-N)` 引用（12 组），色值定义在 CSS 里，主题切换零 JS 参与。
- 网格卡里的 logo 容器统一用中性 `--logo-tile-bg`（浅 `rgba(15,20,35,.05)` / 深 `rgba(255,255,255,.07)`），
  **不按域名铺彩色块** —— 一屏二十多张卡会变万花筒，颜色预算全留给文字层级。
- favicon 兜底首字块播 `--badge-bg-N` / `--badge-fg-N` 两套色板，全部低饱和。

## 5. 原生控件适配

```css
:root { color-scheme: light; }
:root[data-theme='dark'] { color-scheme: dark; }
```

连带生效：原生 select 下拉、滚动条、input 自动填充、checkbox。滚动条 thumb 与 `::selection`
也都走变量（`--scroll-thumb` / `--selection`），深色下 `::selection` 提到
`rgba(10,132,255,.3)`。

## 6. 已下线 / 未实现（原方案里有，现在没有）

- **`glassMode` 与「实心 / 玻璃」开关**：已删除，玻璃是唯一材质（`data-glass` 恒为 `on`）。
- **氛围光晕**：没有。body 只留中性明暗渐变（浅色是顶部 `rgba(255,255,255,.85)` 在 220px 内褪到 0 的
  纵向带，深色是 3.5%–5% 的极淡叠加），只为给 backdrop-filter 一点明暗可折射，不带色相。
- **星标 / `StarButton`**：功能不存在。
- **`coverGradient` / `--cover-a|b` 封面渐变变量**：未采用，封面直接由 favicon 抓取结果或
  logo 底承担。
- 深色「更强的光晕」（原方案里那条 .38/.30/.24 的深色光晕）随光晕一起取消了。

## 7. 验收标准

1. 深色刷新无白闪（FOUC 脚本生效）。
2. `system` 模式随系统切换即时生效，不重启、不重载页面。
3. 正文 ≥7:1、次级 ≥4.5:1；`ink-4` 只出现在占位符 / 图标上。
4. 亮色 / 深色下：拖拽 ring、focus 光环、按钮 hover、selection、滚动条都清晰可辨。
5. 原生 select、滚动条、自动填充与主题一致（`color-scheme` 生效）。