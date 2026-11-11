import { describe, expect, it } from 'vitest'
import { engineDomain, guessEngineName, parseEngineUrl } from './engines'

function templateOf(input: string) {
  const result = parseEngineUrl(input)
  if (!result.ok) throw new Error(result.error)
  return result.template
}

describe('parseEngineUrl', () => {
  it('从知乎搜索结果链接识别 q 参数，保留其他参数', () => {
    const t = templateOf('https://www.zhihu.com/search?type=content&q=视觉中国')
    expect(t.url).toBe('https://www.zhihu.com/search?type=content&q=%s')
    expect(t.param).toBe('q')
    expect(t.name).toBe('知乎')
  })

  it('必应 / 百度 / YouTube 各用各的关键词参数', () => {
    expect(templateOf('https://www.bing.com/search?q=react&form=QBLH').url).toBe(
      'https://www.bing.com/search?q=%s&form=QBLH',
    )
    expect(templateOf('https://www.baidu.com/s?wd=react&ie=utf-8').url).toBe(
      'https://www.baidu.com/s?wd=%s&ie=utf-8',
    )
    expect(templateOf('https://www.youtube.com/results?search_query=react').url).toBe(
      'https://www.youtube.com/results?search_query=%s',
    )
  })

  it('认空值的关键词参数（搜索页还没输入关键词时粘贴也能用）', () => {
    const t = templateOf('https://www.zhihu.com/search?q=')
    expect(t.url).toBe('https://www.zhihu.com/search?q=%s')
  })

  it('参数名大小写不敏感，也覆盖电商站的特殊参数', () => {
    expect(templateOf('https://www.kuaishou.com/search/video?searchKey=react').url).toBe(
      'https://www.kuaishou.com/search/video?searchKey=%s',
    )
    expect(templateOf('https://www.ebay.com/sch/i.html?_nkw=react').url).toBe(
      'https://www.ebay.com/sch/i.html?_nkw=%s',
    )
  })

  it('自动补 https://', () => {
    expect(templateOf('www.zhihu.com/search?q=react').url).toBe(
      'https://www.zhihu.com/search?q=%s',
    )
  })

  it('兼容旧的手写 %s 模板', () => {
    const t = templateOf('zhihu.com/search?q=%s')
    expect(t.url).toBe('https://zhihu.com/search?q=%s')
    expect(t.param).toBeNull()
    expect(t.name).toBe('知乎')
  })

  it('识别 hash 路由里的关键词', () => {
    expect(templateOf('https://example.com/#/search?q=react').url).toBe(
      'https://example.com/#/search?q=%s',
    )
  })

  it('识别路径式搜索', () => {
    expect(templateOf('https://www.tumblr.com/search/react').url).toBe(
      'https://www.tumblr.com/search/%s',
    )
    expect(templateOf('https://unsplash.com/s/photos/react').url).toBe(
      'https://unsplash.com/s/photos/%s',
    )
  })

  it('常规页面没有关键词时给出可操作的提示', () => {
    const result = parseEngineUrl('https://www.zhihu.com/people/morgan')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('%s')
  })

  it('拒绝非 http(s) 链接', () => {
    const result = parseEngineUrl('ftp://example.com/search?q=react')
    expect(result.ok).toBe(false)
  })
})

describe('guessEngineName', () => {
  it('常见站点用中文名 / 品牌名', () => {
    expect(guessEngineName('https://search.bilibili.com/all?keyword=react')).toBe('哔哩哔哩')
    expect(guessEngineName('https://github.com/search?q=react')).toBe('GitHub')
  })

  it('没收录的站点用主域名兜底', () => {
    expect(guessEngineName('https://www.example.co.uk/search?q=react')).toBe('Example')
    expect(guessEngineName('https://foo.bar.com/search?q=react')).toBe('Bar')
  })
})

describe('engineDomain', () => {
  it('从模板里取域名，%s 不影响解析', () => {
    expect(engineDomain({ url: 'https://www.tumblr.com/search/%s' })).toBe('tumblr.com')
  })
})