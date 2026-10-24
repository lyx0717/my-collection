import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { pool } from './db'
import { migrate } from './migrate'

/** 探一次库：本机没起 Postgres 时跳过，而不是让整个 test 失败 */
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
  console.warn('跳过限流测试：连不上 Postgres。先执行 pnpm db:up && pnpm migrate')
}

describe.skipIf(!ready)('登录限流与密码重置', () => {
  let app: FastifyInstance
  const run = Date.now()
  const mail = `rl${run}@test.local`
  const pass = 'password-ok'
  // 注意：必须 ≥6 位，否则在校验层就 400 了，根本走不到限流逻辑
  const WRONG = 'wrong-password'

  beforeAll(async () => {
    await migrate()
    app = await buildApp()
    await app.ready()
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: mail, password: pass },
    })
  })

  beforeEach(async () => {
    // 每个用例从零开始，避免互相影响
    await pool.query('DELETE FROM login_attempts')
    await pool.query('DELETE FROM password_resets')
  })

  afterAll(async () => {
    await pool.query('DELETE FROM login_attempts WHERE email = $1', [mail])
    await pool.query('DELETE FROM users WHERE email = $1', [mail])
    await app.close()
  })

  const login = (password: string, ip = '203.0.113.7') =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: mail, password },
      remoteAddress: ip,
    })

  it('连续 5 次密码错误后，第 6 次被 429 拦下', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await login(WRONG)
      expect(res.statusCode).toBe(401)
    }
    const blocked = await login(WRONG)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json().error.code).toBe('RATE_LIMITED')
  })

  it('被锁期间即使密码正确也拒绝（否则锁定形同虚设）', async () => {
    for (let i = 0; i < 5; i++) await login(WRONG)
    const res = await login(pass)
    expect(res.statusCode).toBe(429)
  })

  it('登录成功会清掉该邮箱的失败计数', async () => {
    for (let i = 0; i < 4; i++) await login(WRONG)
    // 还差 1 次到阈值，此时正确登录应成功并清空计数
    const ok = await login(pass)
    expect(ok.statusCode).toBe(200)

    const left = await pool.query('SELECT count(*)::int AS n FROM login_attempts WHERE email = $1 AND succeeded = false', [mail])
    expect(left.rows[0].n).toBe(0)

    // 清空后再错 5 次才会重新被锁
    for (let i = 0; i < 4; i++) {
      expect((await login(WRONG)).statusCode).toBe(401)
    }
  })

  it('换 IP 但同一邮箱仍会被邮箱维度锁住', async () => {
    for (let i = 0; i < 5; i++) await login(WRONG)
    const res = await login(WRONG, '198.51.100.9')
    expect(res.statusCode).toBe(429)
  })

  it('同一 IP 扫不同邮箱，累计 20 次后被 IP 维度拦下', async () => {
    const ip = '192.0.2.44'
    // 每次用不同邮箱，避免撞到邮箱维度的 5 次阈值
    for (let i = 0; i < 20; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: `scan${run}-${i}@test.local`, password: WRONG },
        remoteAddress: ip,
      })
      expect(res.statusCode).toBe(401)
    }
    const blocked = await login(pass, ip)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json().error.message).toContain('请求过于频繁')
  })

  describe('密码重置', () => {
    const mintToken = async (): Promise<string> => {
      const { randomBytes } = await import('node:crypto')
      const { hashToken } = await import('./auth')
      const token = randomBytes(32).toString('base64url')
      await pool.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         SELECT id, $1, now() + interval '15 minutes' FROM users WHERE email = $2`,
        [hashToken(token), mail],
      )
      return token
    }

    it('有效令牌可以换成新密码，且立刻能以新密码登录', async () => {
      const token = await mintToken()

      const check = await app.inject({ method: 'GET', url: `/api/v1/auth/reset?token=${token}` })
      expect(check.statusCode).toBe(200)
      expect(check.json().email).toBe(mail)

      const done = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset',
        payload: { token, newPassword: 'brand-new-pass' },
      })
      expect(done.statusCode).toBe(204)

      const relogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: mail, password: 'brand-new-pass' },
        remoteAddress: '203.0.113.7',
      })
      expect(relogin.statusCode).toBe(200)

      // 换回原密码，后面的用例还要用
      const token2 = await mintToken()
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset',
        payload: { token: token2, newPassword: pass },
      })
    })

    it('令牌是一次性的，用过再提交会失败', async () => {
      const token = await mintToken()
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset',
        payload: { token, newPassword: pass },
      })
      const again = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset',
        payload: { token, newPassword: 'other-pass' },
      })
      expect(again.statusCode).toBe(400)
    })

    it('过期令牌被拒绝', async () => {
      const { randomBytes } = await import('node:crypto')
      const { hashToken } = await import('./auth')
      const token = randomBytes(32).toString('base64url')
      await pool.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         SELECT id, $1, now() - interval '1 minute' FROM users WHERE email = $2`,
        [hashToken(token), mail],
      )
      const res = await app.inject({ method: 'GET', url: `/api/v1/auth/reset?token=${token}` })
      expect(res.statusCode).toBe(400)
    })

    it('伪造令牌被拒绝', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/reset?token=deadbeef-not-a-real-token',
      })
      expect(res.statusCode).toBe(400)
    })

    it('重置成功后所有旧会话失效', async () => {
      const session = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: mail, password: pass },
        remoteAddress: '203.0.113.7',
      })
      const cookie = String(session.headers['set-cookie'] ?? '').match(/sid=([^;]+)/)?.[1]
      expect(cookie).toBeTruthy()

      const token = await mintToken()
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset',
        payload: { token, newPassword: pass },
      })

      const after = await app.inject({
        method: 'GET',
        url: '/api/v1/library',
        cookies: { sid: cookie! },
      })
      expect(after.statusCode).toBe(401)
    })
  })
})
