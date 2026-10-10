import { describe, expect, it } from 'vitest'
import {
  CURRENT_VERSION,
  isForeignSite,
  migrateV2ToV4,
  migrateV3ToV4,
  groupForTags,
  V4_COLLECTIONS,
} from './migrate'
import type { Bookmark, Collection } from '../types'

const V3_COLLECTIONS: Collection[] = [
  { id: 'col_dev', name: '开发', emoji: '💻', order: 0 },
  { id: 'col_ai', name: 'AI', emoji: '🤖', order: 1 },
  { id: 'col_work', name: '工作', emoji: '💼', order: 2 },
  { id: 'col_life', name: '生活', emoji: '🏠', order: 3 },
  { id: 'col_media', name: '影音', emoji: '🎬', order: 4 },
  { id: 'col_tool', name: '工具', emoji: '🧰', order: 5 },
  { id: 'col_net', name: '网络', emoji: '🌐', order: 6 },
]

const OLD_COLLECTIONS: Collection[] = [
  { id: 'col_social', name: '主页', emoji: '🏠', order: 0 },
  { id: 'col_shop', name: '杂项', emoji: '🛒', order: 1 },
  { id: 'col_ai', name: 'AI', emoji: '🤖', order: 2 },
  { id: 'col_work', name: '工作', emoji: '💼', order: 3 },
  { id: 'col_dev', name: '程序员', emoji: '💻', order: 4 },
  { id: 'col_life', name: '科学', emoji: '✈️', order: 5 },
]

/** 造一条 v3 书签 */
function bm(id: string, domain: string, collectionId?: string) {
  return {
    id,
    url: `https://${domain}`,
    title: id,
    domain,
    collectionId,
    starred: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    order: 0,
  }
}

/** 造一条 v2 书签（带 tags） */
function legacy(id: string, tags: string[], domain = 'example.com', collectionId?: string) {
  return { ...bm(id, domain, collectionId), tags }
}

describe('isForeignSite', () => {
  it('识别境外站点', () => {
    expect(isForeignSite('youtube.com')).toBe(true)
    expect(isForeignSite('x.com')).toBe(true)
    expect(isForeignSite('instagram.com')).toBe(true)
    expect(isForeignSite('libvio.cam')).toBe(true)
  })

  it('国内站点不算境外', () => {
    expect(isForeignSite('bilibili.com')).toBe(false)
    expect(isForeignSite('taobao.com')).toBe(false)
    expect(isForeignSite('xhslink.com')).toBe(false)
    expect(isForeignSite('cn.vuejs.org')).toBe(false)
  })

  it('内网 IP 与 .hngtrust.com 视为国内', () => {
    expect(isForeignSite('10.213.151.249')).toBe(false)
    expect(isForeignSite('gitlab.hngtrust.com')).toBe(false)
  })

  it('未知域名默认按国内处理——宁可漏判不可误判', () => {
    expect(isForeignSite('some-new-site.com')).toBe(false)
    expect(isForeignSite('')).toBe(false)
    expect(isForeignSite(undefined)).toBe(false)
  })

  it('www 前缀与连字符子域都要能识别', () => {
    // YouTube 下载站真实域名是 v21.www-y2mate.com，首层 v21 剥不动 www-
    expect(isForeignSite('v21.www-y2mate.com')).toBe(true)
    expect(isForeignSite('www.youtube.com')).toBe(true)
  })
})

describe('groupForTags', () => {
  it('按标签语义归组', () => {
    expect(groupForTags(['前端'])).toBe('col_dev')
    expect(groupForTags(['大模型'])).toBe('col_ai')
    expect(groupForTags(['工作后台'])).toBe('col_work')
    expect(groupForTags(['电商'])).toBe('col_life')
    expect(groupForTags(['视频'])).toBe('col_life')
    expect(groupForTags(['Mac软件'])).toBe('col_tool')
  })

  it('强特征词优先于泛词：「机场」不被「导航」抢走', () => {
    expect(groupForTags(['机场', '导航'])).toBe('col_sci')
  })

  it('「视频」优先于「下载工具」', () => {
    // X / YouTube 视频下载带的是下载工具标签，但按用途应归生活语义
    expect(groupForTags(['下载工具', '视频'])).toBe('col_life')
  })

  it('生活语义 + 境外域名 → 改判「科学」', () => {
    expect(groupForTags(['视频'], 'youtube.com')).toBe('col_sci')
    expect(groupForTags(['社交'], 'instagram.com')).toBe('col_sci')
    // 国内视频站维持生活
    expect(groupForTags(['视频'], 'bilibili.com')).toBe('col_life')
  })

  it('非生活语义不受境外改判影响', () => {
    expect(groupForTags(['前端'], 'github.com')).toBe('col_dev')
    expect(groupForTags(['机场'], 'some-airport.com')).toBe('col_sci')
  })

  it('无法判定时返回 undefined，落入未分组而非乱归', () => {
    expect(groupForTags([])).toBeUndefined()
    expect(groupForTags(['完全不认识的标签'])).toBeUndefined()
  })
})

describe('migrateV3ToV4', () => {
  const run = (bookmarks: Bookmark[]) =>
    migrateV3ToV4({ version: 3, bookmarks, collections: V3_COLLECTIONS })

  it('书签字数不变——迁移绝不能丢数据', () => {
    const input = [
      bm('a', 'github.com', 'col_dev'),
      bm('b', 'youtube.com', 'col_media'),
      bm('c', 'bilibili.com', 'col_media'),
      bm('d', 'jd.com', 'col_life'),
      bm('e', 'x.com', 'col_life'),
    ]
    expect(run(input).bookmarks).toHaveLength(input.length)
  })

  it('影音解散：国内条目并入生活', () => {
    const out = run([bm('cn', 'bilibili.com', 'col_media')])
    expect(out.bookmarks[0].collectionId).toBe('col_life')
  })

  it('影音里的境外条目抽入科学', () => {
    const out = run([bm('yt', 'youtube.com', 'col_media')])
    expect(out.bookmarks[0].collectionId).toBe('col_sci')
  })

  it('生活里的境外条目也抽入科学', () => {
    const out = run([bm('ig', 'instagram.com', 'col_life')])
    expect(out.bookmarks[0].collectionId).toBe('col_sci')
  })

  it('网络组 id 迁移为col_sci（机场梯子留在原处）', () => {
    const out = run([bm('airport', 'xn--4gq62f52gdss.ink', 'col_net')])
    expect(out.bookmarks[0].collectionId).toBe('col_sci')
  })

  it('输出 6 个分组、版本 4，且已解散分组不再出现', () => {
    const out = run([bm('a', 'github.com', 'col_dev')])
    expect(out.version).toBe(CURRENT_VERSION)
    expect(out.collections.map((c) => c.id)).toEqual(V4_COLLECTIONS.map((c) => c.id))
    const ids = out.collections.map((c) => c.id)
    expect(ids).not.toContain('col_media')
    expect(ids).not.toContain('col_net')
    expect(out.collections.find((c) => c.id === 'col_sci')?.name).toBe('科学')
  })

  it('用户自建分组被保留并排在新分组之后', () => {
    const out = migrateV3ToV4({
      version: 3,
      bookmarks: [bm('a', 'example.com', 'col_custom')],
      collections: [...V3_COLLECTIONS, { id: 'col_custom', name: '我的', order: 9 }],
    })
    expect(out.collections).toHaveLength(7)
    const custom = out.collections.find((c) => c.id === 'col_custom')
    expect(custom?.name).toBe('我的')
    expect(custom?.order).toBe(V4_COLLECTIONS.length)
    expect(out.bookmarks[0].collectionId).toBe('col_custom')
  })

  it('未分组书签保持未分组', () => {
    const out = run([bm('free', 'some-site.com')])
    expect(out.bookmarks[0].collectionId).toBeUndefined()
  })

  it('书签其他字段原样保留', () => {
    const out = run([{ ...bm('keep', 'github.com', 'col_dev'), starred: true, order: 7 }])
    expect(out.bookmarks[0]).toMatchObject({
      id: 'keep',
      url: 'https://github.com',
      title: 'keep',
      starred: true,
      order: 7,
    })
  })
})

describe('migrateV2ToV4', () => {
  it('书签字数不变——迁移绝不能丢数据', () => {
    const input = {
      version: 2,
      collections: OLD_COLLECTIONS,
      bookmarks: [
        legacy('a', ['前端']),
        legacy('b', ['机场', '导航']),
        legacy('c', ['大模型']),
        legacy('d', []),
      ],
    }
    expect(migrateV2ToV4(input).bookmarks).toHaveLength(input.bookmarks.length)
  })

  it('标签被清空，改由 collectionId 承载分类', () => {
    const out = migrateV2ToV4({
      version: 2,
      collections: OLD_COLLECTIONS,
      bookmarks: [legacy('a', ['前端', 'Vue'])],
    })
    expect('tags' in out.bookmarks[0]).toBe(false)
    expect(out.bookmarks[0].collectionId).toBe('col_dev')
  })

  it('境外视频站直迁 v4 时落到科学而非生活', () => {
    const out = migrateV2ToV4({
      version: 2,
      collections: OLD_COLLECTIONS,
      bookmarks: [legacy('yt', ['视频'], 'youtube.com')],
    })
    expect(out.bookmarks[0].collectionId).toBe('col_sci')
  })

  it('无法归类的书签落入未分组，不丢条目', () => {
    const out = migrateV2ToV4({
      version: 2,
      collections: OLD_COLLECTIONS,
      bookmarks: [legacy('x', ['某冷门标签'], 'example.com', 'col_social')],
    })
    expect(out.bookmarks).toHaveLength(1)
    // 原分组 col_social 已解散，故应落入未分组
    expect(out.bookmarks[0].collectionId).toBeUndefined()
  })

  it('网络组旧 id 直迁到科学', () => {
    const out = migrateV2ToV4({
      version: 2,
      collections: V3_COLLECTIONS,
      bookmarks: [legacy('airport', ['机场'], 'xn--4gq62f52gdss.ink', 'col_net')],
    })
    expect(out.bookmarks[0].collectionId).toBe('col_sci')
  })

  it('输出 6 个分组、版本 4', () => {
    const out = migrateV2ToV4({
      version: 2,
      collections: OLD_COLLECTIONS,
      bookmarks: [legacy('a', ['前端'])],
    })
    expect(out.version).toBe(CURRENT_VERSION)
    expect(out.collections).toHaveLength(6)
    expect(out.collections.map((c) => c.id)).toEqual(V4_COLLECTIONS.map((c) => c.id))
  })
})