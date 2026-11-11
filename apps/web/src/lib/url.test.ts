import { describe, expect, it } from 'vitest'
import { dedupeKey, extractDomain, isValidUrl, normalizeUrl } from './url'

describe('normalizeUrl', () => {
  it('补全 https、去 hash、去 www', () => {
    expect(normalizeUrl('www.example.com/path#frag')).toBe('https://example.com/path')
  })

  it('保留用户写的末尾斜杠，query 也不动', () => {
    // /tstc-ui 与 /tstc-ui/ 对某些服务端是两条路径，后者才对；
    // 早期版本会抹掉末尾斜杠，导致点开被站点 301 到别的端口
    expect(normalizeUrl('https://dualdemo.example.com/tstc-ui/')).toBe(
      'https://dualdemo.example.com/tstc-ui/',
    )
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
    expect(normalizeUrl('https://example.com/?a=1')).toContain('a=1')
  })

  it('域名小写', () => {
    expect(normalizeUrl('HTTPS://Example.COM')).toBe('https://example.com/')
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

  it('末尾斜杠不同也判为同一条', () => {
    expect(dedupeKey('https://example.com/tstc-ui/')).toBe(dedupeKey('https://example.com/tstc-ui'))
  })

  it('有 query 时不抹斜杠，避免把 /a/?x 与 /a?x 混为一条', () => {
    expect(dedupeKey('https://example.com/tstc-ui/?x=1')).not.toBe('https://example.com/tstc-ui?x=1')
  })

  it('根路径与之前算出的键一致（老数据不用迁移）', () => {
    expect(dedupeKey('https://oms.example.com')).toBe('https://oms.example.com')
  })
})
