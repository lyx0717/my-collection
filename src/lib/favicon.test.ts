import { describe, expect, it } from 'vitest'
import { isInternalDomain, faviconSources } from './favicon'

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

  it('外网优先站点 ico', () => {
    expect(faviconSources('example.com')).toEqual(['https://example.com/favicon.ico'])
  })

  it('自定义图标排在前面', () => {
    expect(faviconSources('example.com', 'https://cdn/logo.png')).toEqual([
      'https://cdn/logo.png',
      'https://example.com/favicon.ico',
    ])
  })
})
