import { describe, expect, it } from 'vitest'
import { exportNetscape, parseNetscape } from './netscape'
import type { Bookmark, Collection } from '../types'

const bookmarks: Bookmark[] = [
  {
    id: '1',
    url: 'https://github.com/',
    title: 'GitHub',
    domain: 'github.com',
    collectionId: 'col_dev',
    tags: ['工具'],
    starred: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    url: 'https://example.com/',
    title: 'Example',
    domain: 'example.com',
    tags: [],
    starred: false,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

const collections: Collection[] = [{ id: 'col_dev', name: '开发', emoji: '💻', order: 0 }]

describe('exportNetscape + parseNetscape', () => {
  it('导出后可解析回分组与书签', () => {
    const html = exportNetscape(bookmarks, collections)
    expect(html).toContain('NETSCAPE-Bookmark-file-1')
    const parsed = parseNetscape(html)
    expect(parsed.collectionNames).toContain('开发')
    expect(parsed.bookmarks.map((b) => b.url).sort()).toEqual(
      ['https://example.com/', 'https://github.com/'].sort(),
    )
    const gh = parsed.bookmarks.find((b) => b.url.includes('github'))
    expect(gh?.collectionName).toBe('开发')
  })
})

describe('parseNetscape 非法链接', () => {
  it('跳过 javascript: 等非 http 链接', () => {
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="https://vite.dev/">Vite</A>
  <DT><A HREF="javascript:void(0)">无效</A>
</DL><p>`
    const parsed = parseNetscape(html)
    expect(parsed.bookmarks).toHaveLength(1)
    expect(parsed.bookmarks[0].url).toBe('https://vite.dev/')
  })
})
