/**
 * 前后端共享的领域类型与 API 契约。
 *
 * 只放两端都需要的：数据形状 + 接口出入参。
 * UI 概念（视图模式、导航作用域、导入解析中间态）留在 apps/web/src/types.ts。
 */

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
  /** lucide 图标名（见 apps/web/src/lib/collectionIcons.ts）。缺省时按名称 hash 稳定取一个。 */
  icon?: string
  order: number
}

/** 完整书库（导出文件与 GET /library 共用的形状） */
export interface StoreShape {
  version: 4
  bookmarks: Bookmark[]
  collections: Collection[]
}

/** 新建/编辑表单提交的数据；id / domain / 时间戳由服务端补齐 */
export type BookmarkInput = Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'domain'>

/** 批量导入（POST /bookmarks/bulk）提交的条目 */
export interface BookmarkDraft {
  url: string
  title: string
  description?: string
  faviconUrl?: string
  cover?: string
  collectionId?: string
  /** 导入源里的收录时间；缺省用服务端当前时间 */
  createdAt?: string
}

// —— API 契约 ——

/** 当前登录用户（不含任何密码字段） */
export interface AuthUser {
  id: string
  email: string
  createdAt: string
}

/** GET /library 的响应 */
export interface LibraryResponse {
  bookmarks: Bookmark[]
  collections: Collection[]
}

export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL'

/** 统一错误响应体 */
export interface ApiErrorBody {
  error: {
    code: ErrorCode
    message: string
  }
}
