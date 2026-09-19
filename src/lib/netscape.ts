import type { Bookmark, Collection, ParsedImportBookmark } from '../types'

/**
 * 解析浏览器导出的 Netscape Bookmark HTML。
 * 兼容 DT 内嵌 DL，以及 H3 与后续 DL 相邻的常见结构；深层文件夹拍平到顶层分组。
 */
export function parseNetscape(html: string): {
  bookmarks: ParsedImportBookmark[]
  collectionNames: string[]
} {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const bookmarks: ParsedImportBookmark[] = []
  const collectionNames: string[] = []

  const consumeAnchor = (a: Element, collectionName?: string) => {
    const url = (a.getAttribute('href') ?? '').trim()
    if (!/^https?:\/\//i.test(url)) return
    const addDate = a.getAttribute('add_date')
    bookmarks.push({
      url,
      title: (a.textContent ?? '').trim() || url,
      tags: (a.getAttribute('tags') ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      collectionName,
      createdAt:
        addDate && /^\d+$/.test(addDate)
          ? new Date(Number(addDate) * 1000).toISOString()
          : undefined,
    })
  }

  const walk = (parent: Element, folder: string | undefined, depth: number) => {
    let current = folder
    for (const child of Array.from(parent.children)) {
      const tag = child.tagName.toUpperCase()

      if (tag === 'H3') {
        const name = (child.textContent ?? '').trim()
        if (depth === 0 && name) {
          collectionNames.push(name)
          current = name
        }
        continue
      }

      if (tag === 'A') {
        consumeAnchor(child, current)
        continue
      }

      if (tag === 'DT') {
        const h3 = Array.from(child.children).find((c) => c.tagName.toUpperCase() === 'H3')
        if (h3) {
          const name = (h3.textContent ?? '').trim()
          if (depth === 0 && name) {
            collectionNames.push(name)
            current = name
          }
        }
        walk(child, current, depth)
        continue
      }

      if (tag === 'DL') {
        walk(child, current, depth + 1)
        continue
      }

      // <p> 等包装元素内可能直接放 A
      walk(child, current, depth)
    }
  }

  const root = doc.querySelector('dl') ?? doc.body ?? doc.documentElement
  if (root) walk(root, undefined, 0)

  return { bookmarks, collectionNames: [...new Set(collectionNames)] }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 导出为可被 Chrome/Safari/Edge/Firefox 导回的 Netscape HTML */
export function exportNetscape(bookmarks: Bookmark[], collections: Collection[]): string {
  const colMap = new Map(collections.map((c) => [c.id, c]))
  const groups = new Map<string, Bookmark[]>()
  for (const bm of bookmarks) {
    const key = bm.collectionId && colMap.has(bm.collectionId) ? bm.collectionId : '__none__'
    const list = groups.get(key) ?? []
    list.push(bm)
    groups.set(key, list)
  }

  const renderLinks = (list: Bookmark[]) =>
    list
      .map((bm) => {
        const add = Math.floor(new Date(bm.createdAt).getTime() / 1000) || ''
        const tags = bm.tags.map(escapeHtml).join(',')
        const desc = bm.description ? `\n    <DD>${escapeHtml(bm.description)}` : ''
        return `    <DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${add}"${
          tags ? ` TAGS="${tags}"` : ''
        }>${escapeHtml(bm.title)}</A>${desc}`
      })
      .join('\n')

  const blocks: string[] = []
  for (const col of collections) {
    const list = groups.get(col.id)
    if (!list?.length) continue
    blocks.push(
      `  <DT><H3>${escapeHtml(col.name)}</H3>\n  <DL><p>\n${renderLinks(list)}\n  </DL><p>`,
    )
  }
  const loose = groups.get('__none__')
  if (loose?.length) blocks.push(renderLinks(loose))

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. It can be imported by any major browser. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${blocks.join('\n')}
</DL><p>
`
}
