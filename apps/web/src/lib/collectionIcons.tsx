import type { ReactNode } from 'react'
import {
  Bookmark,
  Briefcase,
  Camera,
  Code,
  Compass,
  Cpu,
  Film,
  Folder,
  Gamepad2,
  GraduationCap,
  Heart,
  Home,
  Library,
  Lightbulb,
  Music,
  Newspaper,
  Palette,
  Plane,
  Plus,
  Radio,
  ShoppingBag,
  Sparkles,
  Utensils,
  Wrench,
  Zap,
} from 'lucide-react'

/**
 * 分组图标候选池。
 *
 * 为什么改用 SVG 而非 emoji：
 * 1. emoji 是彩色位图，跟界面的单色线性图标（lucide）放在一起时，
 *    两者的视觉重量、笔画粗细、基线全都不一致 —— 这正是「杂乱」的来源。
 * 2. emoji 跨平台渲染差异极大（Apple Color Emoji 与 Segoe UI Emoji 长得不一样），
 *    同一份数据在不同机器上是两套设计。
 * 3. lucide 图标可跟随 currentColor，选中态能随主题反色。
 *
 * 所有图标统一 strokeWidth 1.8，与设置页导航保持同一套线条重量。
 */
export const COLLECTION_ICONS = [
  Folder,
  Bookmark,
  Home,
  Code,
  Cpu,
  Lightbulb,
  GraduationCap,
  Library,
  Newspaper,
  Briefcase,
  Wrench,
  ShoppingBag,
  Utensils,
  Camera,
  Film,
  Music,
  Gamepad2,
  Palette,
  Plane,
  Compass,
  Heart,
  Zap,
  Sparkles,
  Radio,
  Plus,
] as const

/**
 * 图标名候选池 —— **字符串**，与 COLLECTION_ICONS 一一对应、顺序相同。
 *
 * 为什么必须单独维护一份字符串名单（关键，曾是选中态 bug 的根因）：
 * · 持久化数据（Collection.icon）、seed、migrate 存的都是字符串，如 "Code"；
 * · 而 COLLECTION_ICONS 存的是**组件引用**，两者不是一回事；
 * · 早先在弹窗里写 `(Icon as {name?}).name` 想从组件反查名字，
 *   但 lucide 是 forwardRef 组件，名字挂在 **displayName** 上，
 *   `.name` 恒为 undefined → 所有图标算出的名字都是空串，
 *   于是 `preview === name` 对每一个图标都成立 → 整排全被标成选中。
 *
 * 名称池与组件池同序，靠 COLLECTION_ICON_NAMES[i] ↔ COLLECTION_ICONS[i] 对应；
 * 下方 has() / nameOf() / componentOf() 三函数把这层对应关系收口，
 * 调用方不再需要自己处理「字符串 ↔ 组件」的转换。
 */
export const COLLECTION_ICON_NAMES = [
  'Folder',
  'Bookmark',
  'Home',
  'Code',
  'Cpu',
  'Lightbulb',
  'GraduationCap',
  'Library',
  'Newspaper',
  'Briefcase',
  'Wrench',
  'ShoppingBag',
  'Utensils',
  'Camera',
  'Film',
  'Music',
  'Gamepad2',
  'Palette',
  'Plane',
  'Compass',
  'Heart',
  'Zap',
  'Sparkles',
  'Radio',
  'Plus',
] as const

export type CollectionIconName = (typeof COLLECTION_ICON_NAMES)[number]

function isIconName(v: unknown): v is CollectionIconName {
  return (
    typeof v === 'string' && (COLLECTION_ICON_NAMES as readonly unknown[]).includes(v)
  )
}

/** 候选池索引（越界回落到首个） */
function indexOfName(v: unknown): number {
  const i = (COLLECTION_ICON_NAMES as readonly unknown[]).indexOf(v)
  return i === -1 ? 0 : i
}

/** 名字是否在候选池内 */
export function hasCollectionIcon(v: unknown): v is CollectionIconName {
  return isIconName(v)
}

/** 名字 → 组件（内部用；外部请用 renderCollectionIcon） */
export function componentOf(name: CollectionIconName) {
  return COLLECTION_ICONS[indexOfName(name)]
}

/** 统一渲染：尺寸与线宽固定，调用方不必每次都传 strokeWidth */
export function renderCollectionIcon(name: string, size = 16): ReactNode {
  const Icon = isIconName(name) ? componentOf(name) : COLLECTION_ICONS[0]
  return <Icon size={size} strokeWidth={1.8} />
}

/**
 * 没有指定图标时，按分组名 hash 从候选池里稳定取一个。
 *
 * 为什么要有 fallback 而不是统一给 Folder：
 * 导航里每个分组都有自己的图标，全是同一个 Folder 就失去了图标的意义 ——
 * 用户扫一眼分不清哪个是哪个。hash 保证同一个名字永远得到同一个图标，
 * 改名才会变，视觉上稳定。
 *
 * 返回**名字**而非组件：调用方要么用 renderCollectionIcon 渲染，
 * 要么拿名字去做选中态比较（后者才是弹窗需要的）。
 */
export function iconNameForCollection(collection: {
  name: string
  icon?: string
}): CollectionIconName {
  if (isIconName(collection.icon)) return collection.icon
  let h = 0
  const s = collection.name
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return COLLECTION_ICON_NAMES[Math.abs(h) % COLLECTION_ICON_NAMES.length]
}

/**
 * 把任意来源的图标值收敛成候选池内的合法名字。
 *
 * 存在的理由：数据可能来自旧版本 seed、手工导入的 JSON，
 * 里面可能有早已下线的图标名。直接拿来比较会导致
 * 「一个都选不中」的空洞状态 —— 回落到候选池首位，
 * 至少保证预览与选中态自洽。
 */
export function resolveCollectionIcon(
  value: unknown,
  fallbackName = 'new',
): CollectionIconName {
  if (isIconName(value)) return value
  return iconNameForCollection({ name: fallbackName })
}

/**
 * 图标组件（供导航、分组列表直接渲染）。
 * 与 iconNameForCollection 同源，保证「设置里看到的 = 导航里显示的」。
 */
export function iconForCollection(collection: {
  name: string
  icon?: string
}): (typeof COLLECTION_ICONS)[number] {
  return componentOf(iconNameForCollection(collection))
}
