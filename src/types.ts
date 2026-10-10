export interface Bookmark {
  id: string
  url: string
  title: string
  /** 手动排序序号（全局顺序，0 开始；缺省按数组位置补齐） */
  order?: number
  description?: string
  /** 规范化域名，去 www，用于图标/筛选/去重 */
  domain: string
  faviconUrl?: string
  cover?: string
  /** undefined = 未分组；未分组书签归入「全部」，不再有独立视图 */
  collectionId?: string
  createdAt: string
  updatedAt: string
}

export interface Collection {
  id: string
  name: string
  /** lucide 图标名（见 lib/collectionIcons.ts）。缺省时按名称 hash 稳定取一个。 */
  icon?: string
  order: number
}

export interface StoreShape {
  version: 4
  bookmarks: Bookmark[]
  collections: Collection[]
}

/** 新建/编辑表单提交的数据 */
export type BookmarkInput = Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'domain'>

export type ViewMode = 'list' | 'grid' | 'tile'
export type SortMode = 'desc' | 'asc' | 'az'

/**
 * 分组导航的作用域。
 * 只剩「全部」与「分组」两种 —— 星标视图与未分组视图均已下线，
 * 没有分组的书签直接出现在「全部」里，不再单列。
 */
export type Scope = { type: 'all' } | { type: 'collection'; id: string }

export interface ParsedImportBookmark {
  url: string
  title: string
  description?: string
  /** 导入源里的标签；v3 起不再入库存，仅用于推断分组 */
  tags: string[]
  collectionName?: string
  /** 本站完整备份携带的分组 id */
  collectionId?: string
  createdAt?: string
}
