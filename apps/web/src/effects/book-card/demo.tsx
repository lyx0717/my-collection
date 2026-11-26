import { Archive, BookOpen, Bookmark, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

export interface BookCardData {
  id: string
  title: string
  desc: string
  meta: string
  metaRight: string
  icon: ReactNode
  accent: string
  tint: string
}

/**
 * 四张演示卡。真实产品里这些字段来自收藏夹 / 阅读清单 / 项目归档，
 * 这里只做效果展示，不接数据。
 */
export const BOOK_CARDS: BookCardData[] = [
  {
    id: 'bookmarks',
    title: '收藏夹',
    desc: '把散落的链接收进一个干净的收藏夹。',
    meta: '收藏 · 24 个链接',
    metaRight: '3 天前',
    icon: <Bookmark size={22} strokeWidth={1.8} />,
    accent: '#2f6fed',
    tint: 'rgba(47, 111, 237, 0.12)',
  },
  {
    id: 'reading',
    title: '阅读清单',
    desc: '本周要读的长文，先存在这里，慢慢消化。',
    meta: '阅读 · 8 篇',
    metaRight: '昨天',
    icon: <BookOpen size={22} strokeWidth={1.8} />,
    accent: '#7a5af8',
    tint: 'rgba(122, 90, 248, 0.13)',
  },
  {
    id: 'inspiration',
    title: '灵感收集',
    desc: '截图、配色、动效，看到就先记下来。',
    meta: '灵感 · 17 条',
    metaRight: '2 天前',
    icon: <Sparkles size={22} strokeWidth={1.8} />,
    accent: '#d98324',
    tint: 'rgba(217, 131, 36, 0.14)',
  },
  {
    id: 'archive',
    title: '项目归档',
    desc: '做完的东西别丢，按季度收好。',
    meta: '归档 · 12 个项目',
    metaRight: '上周',
    icon: <Archive size={22} strokeWidth={1.8} />,
    accent: '#2f9e63',
    tint: 'rgba(47, 158, 99, 0.13)',
  },
]
