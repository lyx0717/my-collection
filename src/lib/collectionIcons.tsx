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

export type CollectionIconName = (typeof COLLECTION_ICONS)[number]

function isIconName(v: unknown): v is CollectionIconName {
  return typeof v === 'string' && (COLLECTION_ICONS as readonly unknown[]).includes(v)
}

/** 统一渲染：尺寸与线宽固定，调用方不必每次都传 strokeWidth */
export function renderCollectionIcon(name: string, size = 16): ReactNode {
  const Icon = isIconName(name) ? name : Folder
  return <Icon size={size} strokeWidth={1.8} />
}

/**
 * 没有指定图标时，按分组名 hash 从候选池里稳定取一个。
 *
 * 为什么要有 fallback 而不是统一给 Folder：
 * 导航里每个分组都有自己的图标，全是同一个 Folder 就失去了图标的意义 ——
 * 用户扫一眼分不清哪个是哪个。hash 保证同一个名字永远得到同一个图标，
 * 改名才会变，视觉上稳定。
 */
export function iconForCollection(collection: { name: string; icon?: string }): CollectionIconName {
  if (isIconName(collection.icon)) return collection.icon
  let h = 0
  const s = collection.name
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return COLLECTION_ICONS[Math.abs(h) % COLLECTION_ICONS.length]
}
