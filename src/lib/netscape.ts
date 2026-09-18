import type { Bookmark, Collection, ParsedImportBookmark } from '../types'

/**
 * 解析浏览器导出的 Netscape Bookmark HTML：
 * <DT><H3>文件夹</H3><DL><DT><A HREF ADD_DATE>标题</A><DD>描述</DL>
 * 深层文件夹拍平，书签归入其最近的顶层分组。
 */
export function parseNetscape(html: string): {
  bookmarks: ParsedImportBookmark[]
  collectionNames: string[]
} {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rootDl = doc.querySelector('dl') ?? doc.body
  const bookmarks: ParsedImportBookmark[] = []
  const collectionNames: string[] = []

  const walk = (dl: Element, topFolder?: string, depth = 0) => {
    for (const child of Array.from(dl.children)) {
      if (child.tagName !== 'DT') {
        // DD（描述）或孤立 <p>，跳过；部分浏览器把 A 直接放在 DL 下
        if (child.tagName === 'A') consumeAnchor(child as HTMLAnchorElement, topFolder)
        continue
      }
      const h3 = child.querySelector('h3')
      const anchor = child.querySelector('a')
      const subDl = child.querySelector('dl')

      if (h3 && subDl) {
        const name = h3.textContent?.trim()
        const folder = depth === 0 && name ? name : topFolder
        if (depth === 0 && name) collectionNames.push(name)
        walk(subDl, folder, depth + 1)
      } else if (anchor) {
        consumeAnchor(anchor, topFolder)
      }
    }
  }

  const consumeAnchor = (a: HTMLAnchorElement, collectionName?: string) => {
    const url = a.getAttribute('href')?.trim() ?? ''
    if (!/^https?:\/\//i.test(url)) return
    const addDate = a.getAttribute('add_date')
    bookmarks.push({
      url,
      title: a.textContent?.trim() || url,
      tags: (a.getAttribute('tags') ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      collectionName,
      createdAt: addDate && /^\d+$/.test(addDate)
        ? new Date(Number(addDate) * 1000).toISOString()
        : undefined,
    })
  }

  if (rootDl) walk(rootDl)
  return { bookmarks, collectionNames: [...new Set(collectionNames)] }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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
    blocks.push(`  <DT><H3>${escapeHtml(col.name)}</H3>\n  <DL><p>\n${renderLinks(list)}\n  </DL><p>`)
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
