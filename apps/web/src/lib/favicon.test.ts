import { describe, expect, it } from 'vitest'
import { isInternalDomain, faviconSources } from './favicon'
import { badgeText } from './badge'

describe('isInternalDomain', () => {
  it('识别内网与保留地址', () => {
    expect(isInternalDomain('localhost')).toBe(true)
    expect(isInternalDomain('192.168.1.1')).toBe(true)
    expect(isInternalDomain('10.0.0.8')).toBe(true)
    expect(isInternalDomain('wiki')).toBe(true)
    expect(isInternalDomain('github.com')).toBe(false)
  })
})

describe('faviconSources', () => {
  it('内网无候选，直接走徽章', () => {
    expect(faviconSources('192.168.1.1')).toEqual([])
  })

  it('外网仅站点 ico', () => {
    expect(faviconSources('example.com')).toEqual(['https://example.com/favicon.ico'])
  })

  it('历史 faviconUrl 排在最前', () => {
    expect(faviconSources('example.com', 'https://cdn/logo.png')).toEqual([
      'https://cdn/logo.png',
      'https://example.com/favicon.ico',
    ])
  })
})

describe('badgeText', () => {
  it('优先名称/标题首字', () => {
    expect(badgeText('example.com', '微博')).toBe('微')
    expect(badgeText('192.168.1.1', '内网服务')).toBe('内')
    expect(badgeText('example.com', 'GitHub')).toBe('G')
  })

  it('无标题时退回域名首字母', () => {
    expect(badgeText('example.com')).toBe('E')
  })
})
