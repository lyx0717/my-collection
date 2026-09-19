import { describe, expect, it } from 'vitest'
import { dedupeKey, extractDomain, isValidUrl, normalizeUrl } from './url'

describe('normalizeUrl', () => {
  it('补全 https、去 hash、去 www', () => {
    expect(normalizeUrl('www.example.com/path#frag')).toBe('https://example.com/path')
  })

  it('去掉无 query 时的末尾斜杠，保留 query', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeUrl('https://example.com/?a=1')).toContain('a=1')
  })

  it('域名小写', () => {
    expect(normalizeUrl('HTTPS://Example.COM')).toBe('https://example.com')
  })
})

describe('extractDomain', () => {
  it('去掉 www', () => {
    expect(extractDomain('https://www.github.com/foo')).toBe('github.com')
  })

  it('非法输入返回空', () => {
    expect(extractDomain('not a url')).toBe('')
  })
})

describe('isValidUrl', () => {
  it('要求 http(s) 且域名带点', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('ftp://example.com')).toBe(false)
    expect(isValidUrl('https://localhost')).toBe(false)
  })
})

describe('dedupeKey', () => {
  it('www / 协议 / hash 归一后可去重', () => {
    expect(dedupeKey('www.Example.com/path#x')).toBe(dedupeKey('https://example.com/path'))
  })
})
