// 领域类型与 API 契约来自 packages/shared，这里再导出，
// 使既有 `from '../types'` 的导入点（30 处）无需改动。
// 用 export type *：编译期完全擦除，不会把 shared 的运行时值带进产物。
export type * from '@my-collection/shared/types'

// —— 以下为前端专有类型（UI 概念，后端不需要）——

export type ViewMode = 'list' | 'grid' | 'tile'
export type SortMode = 'desc' | 'asc' | 'az'

/**
 * 分组导航的作用域。
 * 只剩「全部」与「分组」两种 —— 星标视图与未分组视图均已下线，
 * 没有分组的书签直接出现在「全部」里，不再单列。
 */
export type Scope = { type: 'all' } | { type: 'collection'; id: string }

/** 导入解析的中间态；与入库的 Bookmark 不同，这里保留 tags 供推断分组 */
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
