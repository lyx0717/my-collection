export interface Bookmark {
  id: string
  url: string
  title: string
  description?: string
  /** 规范化域名，去 www，用于图标/筛选/去重 */
  domain: string
  faviconUrl?: string
  cover?: string
  /** undefined = 未分组 */
  collectionId?: string
  tags: string[]
  starred: boolean
  createdAt: string
  updatedAt: string
}

export interface Collection {
  id: string
  name: string
  emoji?: string
  order: number
}

export interface StoreShape {
  version: 2
  bookmarks: Bookmark[]
  collections: Collection[]
}

/** 新建/编辑表单提交的数据 */
export type BookmarkInput = Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'domain' | 'starred'> & {
  starred?: boolean
}

export type ViewMode = 'list' | 'grid'
export type SortMode = 'desc' | 'asc' | 'az'

/** 侧栏作用域 */
export type Scope =
  | { type: 'all' }
  | { type: 'starred' }
  | { type: 'none' }
  | { type: 'collection'; id: string }

export interface ParsedImportBookmark {
  url: string
  title: string
  description?: string
  tags: string[]
  collectionName?: string
  /** 本站完整备份携带的分组 id */
  collectionId?: string
  createdAt?: string
}
