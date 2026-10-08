# my-collection 深色模式方案

> 基于 2026-10-08 代码状态（冷色体系 d56b11e 后）。所有对比度数值均为 WCAG 相对亮度实测。

## 0. 现状盘点（为什么现在做成本低）

- 组件层已基本 token 化：`bg-white` / `text-white` 已清零，全部走 `bg-surface` / `text-ink` 体系 —— **改 token 即全站换肤，无需动组件布局**。
- 阻塞项只剩三类硬编码（见 §4），且都该在深色之前先 token 化。

## 1. 机制：CSS 变量双轨 + `@theme inline`

Tailwind 4 的 `@theme` 是编译期静态值，直接在里面改不运行时切换。标准解法：

```css
/* 1) 实际值挂在 :root，深色用属性选择器覆盖 */
:root {
  --canvas: #f7f8fa;
  --surface: #ffffff;
  /* ...全部 token... */
}
:root[data-theme='dark'] {
  --canvas: #101216;
  /* ...深色对应值... */
}

/* 2) @theme inline 让 utility 直接引用运行时变量 */
@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  /* ... */
}
```

效果：`bg-canvas` / `text-ink3` 等既有 className **一个不改**，`document.documentElement.dataset.theme = 'dark'` 一行切换全站。不用 Tailwind 的 `dark:` 前缀（那要改几十个组件类名，维护成本高）。

## 2. 主题三态与切换

```
type ThemeMode = 'light' | 'dark' | 'system'   // localStorage: mybookmarks:theme
```

- `lib/appearance.ts`：`loadTheme / saveTheme / applyTheme(mode)`，`applyTheme` 设置/移除 `data-theme`；`system` 模式用 `matchMedia('(prefers-color-scheme: dark)')` 并监听 change 事件即时跟随。
- `AppearanceContext` 并入 `theme` state（与 glassMode 平级）。
- `AppearanceSection`：「界面风格（实心/玻璃）」下方加一行「界面主题：浅色 / 深色 / 跟随系统」三 chip。
- **防白闪（FOUC）**：`index.html` `<body>` 前加阻塞内联脚本，读 localStorage 提前设 `data-theme`，否则深色用户每次刷新先白一帧：

```html
<script>
  try {
    var t = localStorage.getItem('mybookmarks:theme');
    if (t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches))
      document.documentElement.dataset.theme = 'dark';
  } catch (e) {}
</script>
```

- `<meta name="theme-color">` 用两条带 media 的，深色切到 `#101216`。

## 3. 深色色板（冷靛蓝延续，全部实测达标）

| Token | 亮色（现状） | 深色（方案） | 深色对比度实测 |
|---|---|---|---|
| canvas | #f7f8fa | **#101216** | — |
| surface | #ffffff | **#181b20** | — |
| surface-2 | #f4f6f8 | **#20242b** | — |
| ink | #1a1d21 | **#e8eaed** | 15.6 on canvas |
| ink2 | #555b66 | **#a8adb6** | 7.7 on surface |
| ink3 | #9aa0a8 | **#80868f** | 5.11 canvas / 4.71 surface |
| ink4（新增，占位符/图标灰） | #71767f* | **#565c66** | 执行时按 ≥3.0 验收 |
| line | #e8eaed | **#2a2e36** | — |
| line2 | #dde1e6 | **#343943** | — |
| accent | #4263eb | **#7a96ff** | 6.8 canvas / 6.3 surface |
| accent-soft | #edf2ff | **rgba(122,150,255,.14)** | — |
| accent-ink | #3b5bdb | **#9db1ff** | 6.8 on soft |
| star | #f5a524 | **#ffb224** | 9.6 on surface |
| danger | #e5484d | **#ff6b6f** | 6.2 on surface |
| success | #2b9e58 | **#45d483** | 9.0 on surface |
| warn（新增） | #b4681c | **#f0a860** | 8.6 on surface |

\* 亮色 ink4 顺手把现在 17 处硬编码灰收进来。注意：现状 ink3 #9aa0a8 只有 **2.48:1**，比上一版暖色的 3.02 更差，深色做完后建议亮色 ink3 同步提到 #8a9099 一档（约 3.1），彻底解决上次评审的 P0。

**深色阴影策略**：黑底上阴影不可见，层次主要靠「surface 比 canvas 亮一档 + 边框」。现有 `rgba(30,40,60,*)` 系阴影保留（无害），hover 强调从阴影改为 `border-color: var(--line2)` 提亮。

## 4. 前置 token 化（深色的阻塞项，一并清掉上次评审的旧账）

| 位置 | 现状 | 改为 |
|---|---|---|
| 占位符 `placeholder:text-[#a8adb7]` ×4、`#9aa1ab` ×3（BookmarkModal/CollectionModal/EngineSearchBox/BookmarkFilterInput） | 硬编码 | `text-ink4` |
| 图标灰 `#9aa1ab` ×2、`#8a9099` ×1（BookmarkRow:118,125 / StarButton:41） | 硬编码 | `text-ink4` |
| 分隔点 `bg-[#c4cad3]`（BookmarkRow:76） | 硬编码 | `bg-line2` |
| 分段控件底 `bg-[#eceef2]`（HomePage:303） | 硬编码 | 新 token `--color-segment`（亮 #eceef2 / 深 #20242b，即 surface-2） |
| 危险 hover `#d03d42`（ConfirmDialog:55） | 硬编码 | 新 token `--color-danger-ink` |
| 警示条一族 `#fdf6ea/#f0d9b5/#b4681c/#8a5a1e`、成功条 `#f4faf6/#d9ecdf/#1e7c47/#4f8a66`（BookmarkModal:291-321、DataSection） | 8 个硬编码 | 新 token：`warn-soft/warn-ink`、`success-soft/success-ink`（深色对应 #2a2418/#f0a860、#16241c/#45d483 一族） |

## 5. 主题感知的域名配色（lib/color.ts）

`letterColor` / `coverGradient` 返回内联 style，JS 感知主题需要全部调用点传参 —— **改用 CSS 变量，零 JS 切换**：

```ts
// color.ts：返回变量引用而不是色值
export function letterColor(domain: string) {
  const i = hashString(domain) % LETTER_PALETTES.length
  return { bg: `var(--badge-bg-${i})`, fg: `var(--badge-fg-${i})` }
}
```

```css
/* index.css：12 组徽章 × 双主题 */
:root { --badge-bg-0: #eef1f5; --badge-fg-0: #3a4150; /* ... */ }
[data-theme='dark'] { --badge-bg-0: #1f2634; --badge-fg-0: #9db8ff; /* ... */ }
```

- 封面渐变同理：`--cover-a/b-0..7`，深色统一压到 `#1d2128 → #262b34` 一带（低饱和深灰蓝，logo 白字仍清晰）。
- Favicon 兜底底色 `#eef1f5` → `var(--badge-bg-0)`。
- 收益：以后调徽章色只改 CSS，且 `prefers-color-scheme` 自动跟随。

## 6. 玻璃模式深色（重头戏，也是这套 UI 的杀手锏）

```css
[data-theme='dark'] {
  --glass-bg: rgba(22, 25, 31, 0.55);
  --glass-bg-soft: rgba(22, 25, 31, 0.48);
  --glass-bg-hover: rgba(28, 32, 40, 0.62);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.16);
  --glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.09);
}
```

- **氛围光晕反而要加强**：深色玻璃需要色彩才看得见折射。body 光晕从亮色的 `.07/.06` 提到 `.38/.30/.24`（靛蓝/紫/青），固定 attachment 不变 —— 这就是「毛玻璃夜色」效果，比亮色玻璃更出效果。
- blur/saturate 值不变。
- 深色玻璃下 `glass-highlight` 高光减弱到 0.09（亮色 0.85），避免白色勾边过亮。

## 7. 原生控件适配（一行但必须做）

```css
:root { color-scheme: light; }
:root[data-theme='dark'] { color-scheme: dark; }
```

影响：原生 select 下拉、滚动条、input 自动填充、checkbox 全部自动跟随。滚动条 thumb 的 `#d4d8de` 换 `var(--line2)`，`::selection` 深色提亮为 `rgba(122,150,255,.32)`。

## 8. 实施顺序

| Phase | 内容 | 规模 |
|---|---|---|
| 1 | index.css `@theme inline` 双轨改造 + §4 前置 token 化（顺手清 17 处硬编码 + ink3 亮色提亮） | ~150 行 |
| 2 | appearance.ts 三态 + Context + AppearanceSection UI + index.html 防闪脚本 | ~110 行 |
| 3 | color.ts 徽章/封面 CSS 变量化 + 玻璃深色 + color-scheme/滚动条/selection | ~120 行 |
| 4 | 全视图截图验收（亮/暗 × 实心/玻璃 = 4 组合），对照本表核对比度 | — |

组件 className 基本零改动；风险集中在 Phase 1（改 @theme 结构后需全量回归一次视觉）。

## 9. 验收标准

1. 正文 ≥7:1、次级 ≥4.5:1、说明文字在 canvas 与 surface 两个底上都 ≥4.5:1
2. 亮/暗 × 实心/玻璃 四组合下：拖拽 ring、focus 光环、星标、selection 均清晰
3. 深色刷新无白闪（FOUC 脚本生效）
4. system 模式随系统切换即时生效，无重启
5. 原生 select / 滚动条 / 自动填充与主题一致
