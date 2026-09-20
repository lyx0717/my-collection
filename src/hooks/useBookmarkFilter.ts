import { useMemo } from 'react'
import type { Bookmark, Collection, Scope } from '../types'

export function scopeFromParams(p: URLSearchParams): Scope {
  const col = p.get('c')
  if (col) return { type: 'collection', id: col }
  if (p.get('star') === '1') return { type: 'starred' }
  if (p.get('none') === '1') return { type: 'none' }
  return { type: 'all' }
}

export interface BookmarkFilterResult {
  query: string
  scope: Scope
  activeTags: string[]
  domainFilter: string
  visible: Bookmark[]
  collectionMap: Map<string, Collection>
  collectionCounts: Map<string, number>
  allTags: Array<[string, number]>
  contextTitle: string
  hasActiveFilter: boolean
  searchFiltered: boolean
  starredCount: number
}

/** 书签库筛选：URL query → 可见列表 + 侧栏计数 */
export function useBookmarkFilter(
  bookmarks: Bookmark[],
  collections: Collection[],
  params: URLSearchParams,
): BookmarkFilterResult {
  const query = params.get('q') ?? ''
  const scope = scopeFromParams(params)
  const activeTags = params.getAll('tag')
  const domainFilter = params.get('d') ?? ''

  return useMemo(() => {
    const collectionMap = new Map(collections.map((c) => [c.id, c]))
    const collectionCounts = new Map<string, number>()
    const tagCounter = new Map<string, number>()
    let starredCount = 0

    for (const bm of bookmarks) {
      const key = bm.collectionId ?? '__none__'
      collectionCounts.set(key, (collectionCounts.get(key) ?? 0) + 1)
      if (bm.starred) starredCount += 1
      for (const t of bm.tags) tagCounter.set(t, (tagCounter.get(t) ?? 0) + 1)
    }

    const allTags = [...tagCounter.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'),
    )

    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const result = bookmarks.filter((bm) => {
      if (scope.type === 'starred' && !bm.starred) return false
      if (scope.type === 'none' && bm.collectionId) return false
      if (scope.type === 'collection' && bm.collectionId !== scope.id) return false
      if (domainFilter && bm.domain !== domainFilter) return false
      if (activeTags.length && !activeTags.every((t) => bm.tags.includes(t))) return false
      if (words.length) {
        const hay = [bm.title, bm.domain, bm.description ?? '', bm.tags.join(' '), bm.url]
          .join('\n')
          .toLowerCase()
        if (!words.every((w) => hay.includes(w))) return false
      }
      return true
    })

    // 手动排序：按 order；搜索结果仍保持全局顺序，便于拖拽回主列表后位置可预期
    result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    let contextTitle = '全部书签'
    if (scope.type === 'starred') contextTitle = '星标书签'
    else if (scope.type === 'none') contextTitle = '未分组'
    else if (scope.type === 'collection')
      contextTitle = collectionMap.get(scope.id)?.name ?? '未知分组'

    return {
      query,
      scope,
      activeTags,
      domainFilter,
      visible: result,
      collectionMap,
      collectionCounts,
      allTags,
      contextTitle,
      hasActiveFilter:
        Boolean(query || activeTags.length || domainFilter) || scope.type !== 'all',
      /** 搜索/标签/域名筛选：临时视图，禁用拖拽排序 */
      searchFiltered: Boolean(query || activeTags.length || domainFilter),
      starredCount,
    }
  }, [bookmarks, collections, query, scope, activeTags, domainFilter])
}
