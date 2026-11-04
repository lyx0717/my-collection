import { afterEach, describe, expect, it, vi } from 'vitest'
import { bookmarkletHref } from './bookmarklet'

// 只替换 location —— 被测函数只读 window.location
const at = (origin: string, pathname: string) => {
  vi.stubGlobal('window', { location: { origin, pathname } })
}

describe('bookmarkletHref', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('打开 #/add 深链并携带当前页地址与标题', () => {
    at('https://book.example.com', '/')
    const href = bookmarkletHref()
    expect(href).toBe(
      "javascript:(function(){open('https://book.example.com/#/add?u='+encodeURIComponent(location.href)+'&t='+encodeURIComponent(document.title),'_blank')})()",
    )
  })

  it('部署在子目录时保留前缀（GitHub Pages 形态）', () => {
    at('https://lyx0717.github.io', '/my-collection/')
    expect(bookmarkletHref()).toContain("'https://lyx0717.github.io/my-collection/#/add?u='")
  })

  it('pathname 末尾是 index.html 时把文件名去掉', () => {
    at('https://x.test', '/app/index.html')
    expect(bookmarkletHref()).toContain("'https://x.test/app/#/add?u='")
  })
})