import type { Item } from '../types'

/** 在标题、来源、备注、标签中做不区分大小写的包含匹配 */
export function matchQuery(item: Item, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [item.title, item.source ?? '', item.description ?? '', item.tags.join(' ')]
    .join('\n')
    .toLowerCase()
  return q.split(/\s+/).every((word) => haystack.includes(word))
}

/** 藏品登记号：按收录时间从早到晚排序，NO.001 起 */
export function buildAccessionMap(items: Item[]): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const map = new Map<string, number>()
  sorted.forEach((item, index) => map.set(item.id, index + 1))
  return map
}

export function formatAccession(n: number): string {
  return `NO.${String(n).padStart(3, '0')}`
}
