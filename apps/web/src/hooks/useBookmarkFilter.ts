import { useMemo } from 'react'
import type { Bookmark, Collection, Scope } from '../types'

export interface BookmarkFilterResult {
  query: string
  scope: Scope
  domainFilter: string
  visible: Bookmark[]
  collectionMap: Map<string, Collection>
  collectionCounts: Map<string, number>
  contextTitle: string
  hasActiveFilter: boolean
  searchFiltered: boolean
}

/** 书签库筛选：URL query → 可见列表 + 分组计数 */
export function useBookmarkFilter(
  bookmarks: Bookmark[],
  collections: Collection[],
  params: URLSearchParams,
): BookmarkFilterResult {
  const query = params.get('q') ?? ''
  // 依赖项必须用原始字符串，不能用 scopeFromParams 返回的对象 ——
  // 它每次调用都返回新对象引用，放进 useMemo 依赖会让 memo 永远失效，
  // 153 条书签的过滤 + 排序在每次渲染时重跑一遍。
  const collectionId = params.get('c') ?? ''
  const domainFilter = params.get('d') ?? ''

  return useMemo(() => {
    const scope: Scope = collectionId ? { type: 'collection', id: collectionId } : { type: 'all' }
    const collectionMap = new Map(collections.map((c) => [c.id, c]))
    const collectionCounts = new Map<string, number>()

    for (const bm of bookmarks) {
      if (bm.collectionId) {
        collectionCounts.set(bm.collectionId, (collectionCounts.get(bm.collectionId) ?? 0) + 1)
      }
    }

    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const result = bookmarks.filter((bm) => {
      if (scope.type === 'collection' && bm.collectionId !== scope.id) return false
      if (domainFilter && bm.domain !== domainFilter) return false
      if (words.length) {
        const hay = [bm.title, bm.domain, bm.description ?? '', bm.url]
          .join('\n')
          .toLowerCase()
        if (!words.every((w) => hay.includes(w))) return false
      }
      return true
    })

    // 手动排序：按 order；搜索结果仍保持全局顺序，便于拖拽回主列表后位置可预期
    result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    const contextTitle =
      scope.type === 'collection'
        ? (collectionMap.get(scope.id)?.name ?? '未知分组')
        : '全部书签'

    return {
      query,
      scope,
      domainFilter,
      visible: result,
      collectionMap,
      collectionCounts,
      contextTitle,
      hasActiveFilter: Boolean(query || domainFilter) || scope.type !== 'all',
      /** 搜索/域名筛选：临时视图，禁用拖拽排序 */
      searchFiltered: Boolean(query || domainFilter),
    }
  }, [bookmarks, collections, query, collectionId, domainFilter])
}
