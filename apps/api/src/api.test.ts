import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { SESSION_COOKIE } from './auth'
import { pool } from './db'
import { migrate } from './migrate'

/** 探一次库：本机没起 Postgres 时跳过集成测试，而不是让整个 test 失败 */
async function dbReady(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

const ready = await dbReady()
if (!ready) {
  console.warn('跳过 API 集成测试：连不上 Postgres。先执行 pnpm db:up && pnpm migrate')
}

describe.skipIf(!ready)('API 集成', () => {
  let app: FastifyInstance
  const run = Date.now()
  const mailA = `a${run}@test.local`
  const mailB = `b${run}@test.local`
  const passA = 'password-a'
  const passB = 'password-b'
  let tokenA = ''
  let tokenB = ''
  let bookmarkId = ''

  /** 从 Set-Cookie 里取出原始会话 token */
  const tokenOf = (res: { headers: Record<string, unknown> }): string => {
    const raw = res.headers['set-cookie']
    const first = Array.isArray(raw) ? raw[0] : String(raw ?? '')
    return first.match(/sid=([^;]+)/)?.[1] ?? ''
  }

  const call = (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    options: { payload?: unknown; token?: string } = {},
  ) =>
    app.inject({
      method,
      url: `/api/v1${url}`,
      payload: options.payload as object | undefined,
      cookies: options.token ? { [SESSION_COOKIE]: options.token } : undefined,
    })

  beforeAll(async () => {
    await migrate()
    app = await buildApp()
  })

  afterAll(async () => {
    if (!ready) return
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [[mailA, mailB]])
    await app.close()
    await pool.end()
  })

  it('注册后即为登录态', async () => {
    const res = await call('POST', '/auth/register', { payload: { email: mailA, password: passA } })
    expect(res.statusCode).toBe(201)
    tokenA = tokenOf(res)
    expect(tokenA).not.toBe('')

    const me = await call('GET', '/auth/me', { token: tokenA })
    expect(me.statusCode).toBe(200)
    expect(me.json().user.email).toBe(mailA)
  })

  it('未登录访问书库返回 401', async () => {
    expect((await call('GET', '/library')).statusCode).toBe(401)
  })

  it('邮箱重复注册返回 409', async () => {
    const res = await call('POST', '/auth/register', { payload: { email: mailA, password: passA } })
    expect(res.statusCode).toBe(409)
  })

  it('密码太短返回 400', async () => {
    const res = await call('POST', '/auth/register', {
      payload: { email: `x${run}@test.local`, password: '123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('错误响应形状是 { error: { code, message } }（前端 api.ts 依赖此契约）', async () => {
    const res = await call('POST', '/auth/register', {
      payload: { email: `y${run}@test.local`, password: '123' },
    })
    const body = res.json() as {
      error?: { code?: string; message?: string }
      statusCode?: number
    }
    expect(body.error?.code).toBe('VALIDATION')
    expect(body.error?.message).toBe('密码至少 6 位')
    // 曾经因为 setErrorHandler 注册在 await register 之后而失效，
    // 错误退回 Fastify 默认形状（顶层 statusCode/error/message），前端只能显示兜底文案
    expect(body.statusCode).toBeUndefined()
  })

  it('密码错误返回 401', async () => {
    const res = await call('POST', '/auth/login', {
      payload: { email: mailA, password: 'wrong-password' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('改密：当前密码不对返回 400（不是 401，避免前端误判会话失效）', async () => {
    const res = await call('PATCH', '/auth/password', {
      token: tokenA,
      payload: { currentPassword: 'wrong-password', newPassword: 'password-a2' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('改密成功后该用户全部会话失效', async () => {
    const other = await call('POST', '/auth/login', {
      payload: { email: mailA, password: passA },
    })
    expect(other.statusCode).toBe(200)
    const otherToken = tokenOf(other)

    const changed = await call('PATCH', '/auth/password', {
      token: tokenA,
      payload: { currentPassword: passA, newPassword: 'password-a2' },
    })
    expect(changed.statusCode).toBe(204)

    const withOldToken = await call('GET', '/auth/me', { token: tokenA })
    expect(withOldToken.statusCode).toBe(401)
    const withOtherToken = await call('GET', '/auth/me', { token: otherToken })
    expect(withOtherToken.statusCode).toBe(401)

    const relogin = await call('POST', '/auth/login', {
      payload: { email: mailA, password: 'password-a2' },
    })
    expect(relogin.statusCode).toBe(200)
    tokenA = tokenOf(relogin)
  })

  it('新建书签时服务端负责归一化', async () => {
    const res = await call('POST', '/bookmarks', {
      token: tokenA,
      payload: { url: 'https://www.Example.com/a?x=1#frag', title: '示例 A' },
    })
    expect(res.statusCode).toBe(201)
    const bookmark = res.json().bookmark
    bookmarkId = bookmark.id
    expect(bookmark.url).toBe('https://example.com/a?x=1')
    expect(bookmark.domain).toBe('example.com')
  })

  it('同一链接重复收藏返回 409', async () => {
    const res = await call('POST', '/bookmarks', {
      token: tokenA,
      payload: { url: 'https://example.com/a?x=1', title: '重复' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('批量导入会跳过重复项', async () => {
    const res = await call('POST', '/bookmarks/bulk', {
      token: tokenA,
      payload: {
        drafts: [
          { url: 'https://example.com/a?x=1', title: '重复' },
          { url: 'https://example.com/b', title: '新条目' },
        ],
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ created: 1, skipped: 1 })
  })

  it('分组名重复返回 409', async () => {
    const created = await call('POST', '/collections', { token: tokenA, payload: { name: '开发' } })
    expect(created.statusCode).toBe(201)
    const again = await call('POST', '/collections', { token: tokenA, payload: { name: '开发' } })
    expect(again.statusCode).toBe(409)
  })

  it('删除分组后其书签回到未分组', async () => {
    const created = await call('POST', '/collections', { token: tokenA, payload: { name: '临时' } })
    const collectionId = created.json().collection.id

    await call('PATCH', `/bookmarks/${bookmarkId}`, {
      token: tokenA,
      payload: { url: 'https://example.com/a?x=1', title: '示例 A', collectionId },
    })

    expect((await call('DELETE', `/collections/${collectionId}`, { token: tokenA })).statusCode).toBe(204)

    const library = await call('GET', '/library', { token: tokenA })
    const bookmark = library.json().bookmarks.find((b: { id: string }) => b.id === bookmarkId)
    expect(bookmark.collectionId).toBeUndefined()
  })

  it('排序必须提交全量 id', async () => {
    const library = await call('GET', '/library', { token: tokenA })
    const ids = library.json().bookmarks.map((b: { id: string }) => b.id)

    const partial = await call('PUT', '/bookmarks/order', {
      token: tokenA,
      payload: { orderedIds: ids.slice(0, 1) },
    })
    expect(partial.statusCode).toBe(400)

    const full = await call('PUT', '/bookmarks/order', {
      token: tokenA,
      payload: { orderedIds: [...ids].reverse() },
    })
    expect(full.statusCode).toBe(204)
  })

  it('跨用户隔离：改 / 删别人的书签返回 404', async () => {
    const reg = await call('POST', '/auth/register', { payload: { email: mailB, password: passB } })
    tokenB = tokenOf(reg)

    const patch = await call('PATCH', `/bookmarks/${bookmarkId}`, {
      token: tokenB,
      payload: { url: 'https://example.com/a?x=1', title: '劫持' },
    })
    expect(patch.statusCode).toBe(404)

    expect((await call('DELETE', `/bookmarks/${bookmarkId}`, { token: tokenB })).statusCode).toBe(404)

    // B 的书库完全看不到 A 的东西
    const library = await call('GET', '/library', { token: tokenB })
    expect(library.json().bookmarks).toHaveLength(0)
    expect(library.json().collections).toHaveLength(0)
  })


  describe('批量操作', () => {
    // 独立用户，避免和前面的用例互相影响
    const mailC = `c${run}@test.local`
    let tokenC = ''
    let colA = ''
    /** 建一条书签并返回 id */
    const mk = async (url: string, title: string): Promise<string> => {
      const res = await call('POST', '/bookmarks', { token: tokenC, payload: { url, title } })
      expect(res.statusCode).toBe(201)
      // 响应体是 { bookmark: {...} }，别直接取 .id
      return res.json().bookmark.id
    }

    beforeAll(async () => {
      const reg = await call('POST', '/auth/register', { payload: { email: mailC, password: passA } })
      tokenC = tokenOf(reg)
      const col = await call('POST', '/collections', { token: tokenC, payload: { name: '待整理' } })
      expect(col.statusCode).toBe(201)
      colA = col.json().collection.id
    })

    it('批量移动到分组，id 全部生效', async () => {
      const a = await mk('https://bulk1.example.com', '一')
      const b = await mk('https://bulk2.example.com', '二')

      const res = await call('PATCH', '/bookmarks/bulk', {
        token: tokenC,
        payload: { ids: [a, b], patch: { collectionId: colA } },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().updated).toBe(2)

      const lib = await call('GET', '/library', { token: tokenC })
      const moved = lib.json().bookmarks.filter((x: { id: string }) => x.id === a || x.id === b)
      expect(moved.every((x: { collectionId: string }) => x.collectionId === colA)).toBe(true)
    })

    it('collectionId 传 null 表示移出分组', async () => {
      const a = await mk('https://bulk3.example.com', '三')
      await call('PATCH', '/bookmarks/bulk', {
        token: tokenC,
        payload: { ids: [a], patch: { collectionId: colA } },
      })

      const res = await call('PATCH', '/bookmarks/bulk', {
        token: tokenC,
        payload: { ids: [a], patch: { collectionId: null } },
      })
      expect(res.statusCode).toBe(200)

      const lib = await call('GET', '/library', { token: tokenC })
      const item = lib.json().bookmarks.find((x: { id: string }) => x.id === a)
      // 服务端用 stripNulls 把为 null 的可选字段整个删掉，所以移出分组后是 undefined 而非 null
      expect(item.collectionId).toBeUndefined()
      expect(item).not.toHaveProperty('collectionId')
    })

    it('批量删除', async () => {
      const a = await mk('https://bulk4.example.com', '四')
      const b = await mk('https://bulk5.example.com', '五')

      const res = await call('POST', '/bookmarks/bulk-delete', { token: tokenC, payload: { ids: [a, b] } })
      expect(res.statusCode).toBe(200)
      expect(res.json().deleted).toBe(2)

      const lib = await call('GET', '/library', { token: tokenC })
      expect(lib.json().bookmarks.some((x: { id: string }) => x.id === a)).toBe(false)
    })

    it('批量更新只影响自己的书签，别人的 id 混进来不生效也不会报错', async () => {
      const mine = await mk('https://bulk6.example.com', '六')
      // museum 用 A 的书签 id（bookmarkId 是主用例建的）
      const res = await call('PATCH', '/bookmarks/bulk', {
        token: tokenC,
        payload: { ids: [mine, bookmarkId], patch: { collectionId: colA } },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().updated).toBe(1) // 只有自己的那条

      // A 的那条完全没被动过
      const aLib = await call('GET', '/library', { token: tokenA })
      const aItem = aLib.json().bookmarks.find((x: { id: string }) => x.id === bookmarkId)
      expect(aItem?.collectionId ?? null).toBeNull()
    })

    it('批量删除不会删掉别人的书签', async () => {
      const before = await call('GET', '/library', { token: tokenA })
      const aCount = before.json().bookmarks.length

      const res = await call('POST', '/bookmarks/bulk-delete', {
        token: tokenC,
        payload: { ids: [bookmarkId] },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().deleted).toBe(0)

      const after = await call('GET', '/library', { token: tokenA })
      expect(after.json().bookmarks.length).toBe(aCount)
    })

    it('移动到别人的分组会被拒绝', async () => {
      const colB = await call('POST', '/collections', { token: tokenB, payload: { name: 'B 的分组' } })
      expect(colB.statusCode).toBe(201)
      const mine = await mk('https://bulk7.example.com', '七')

      const res = await call('PATCH', '/bookmarks/bulk', {
        token: tokenC,
        payload: { ids: [mine], patch: { collectionId: colB.json().collection.id } },
      })
      expect(res.statusCode).toBe(404)
    })

    it('ids 不是合法 uuid 时返回 400', async () => {
      const res = await call('POST', '/bookmarks/bulk-delete', {
        token: tokenC,
        payload: { ids: ['not-a-uuid'] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('空数组不报错，但也不做任何事', async () => {
      const res = await call('POST', '/bookmarks/bulk-delete', { token: tokenC, payload: { ids: [] } })
      expect(res.statusCode).toBe(200)
      expect(res.json().deleted).toBe(0)
    })

    it('未登录不能批量操作', async () => {
      const del = await call('POST', '/bookmarks/bulk-delete', { payload: { ids: [bookmarkId] } })
      expect(del.statusCode).toBe(401)
      const mv = await call('PATCH', '/bookmarks/bulk', { payload: { ids: [bookmarkId], patch: {} } })
      expect(mv.statusCode).toBe(401)
    })
  })

  it('登出后会话失效', async () => {
    expect((await call('POST', '/auth/logout', { token: tokenB })).statusCode).toBe(204)
    expect((await call('GET', '/auth/me', { token: tokenB })).statusCode).toBe(401)
  })
})
