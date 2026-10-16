import type { FastifyInstance } from 'fastify'
import type { AuthUser } from '@my-collection/shared/types'
import {
  clearSessionCookie,
  currentUser,
  hashPassword,
  hashToken,
  requireAuth,
  SESSION_COOKIE,
  startSession,
  verifyPassword,
} from '../auth'
import { query } from '../db'
import { conflict, unauthenticated } from '../errors'
import { email, obj, password } from '../validate'

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  // 注册只要邮箱 + 密码：不做邮箱验证，也不要求密码复杂度
  app.post('/auth/register', async (req, reply) => {
    const body = obj(req.body)
    const mail = email(body.email)
    const pass = password(body.password)

    const exists = await query('SELECT 1 FROM users WHERE lower(email) = $1', [mail])
    if (exists.rowCount) throw conflict('该邮箱已注册')

    const created = await query<AuthUser>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       RETURNING id, email, created_at AS "createdAt"`,
      [mail, hashPassword(pass)],
    )
    const user = created.rows[0]
    await startSession(reply, user.id)
    return reply.code(201).send({ user })
  })

  app.post('/auth/login', async (req, reply) => {
    const body = obj(req.body)
    const mail = email(body.email)
    const pass = password(body.password)

    const found = await query<AuthUser & { password_hash: string }>(
      `SELECT id, email, created_at AS "createdAt", password_hash
       FROM users WHERE lower(email) = $1`,
      [mail],
    )
    const row = found.rows[0]
    // 账号不存在与密码错误给同一句提示，不泄露邮箱是否注册过
    if (!row || !verifyPassword(pass, row.password_hash)) throw unauthenticated('邮箱或密码不正确')

    // 顺手清掉过期会话，省掉一个定时任务
    await query('DELETE FROM sessions WHERE expires_at < now()')
    await startSession(reply, row.id)
    return { user: { id: row.id, email: row.email, createdAt: row.createdAt } }
  })

  app.post('/auth/logout', { onRequest: requireAuth }, async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE]
    if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
    clearSessionCookie(reply)
    return reply.code(204).send()
  })

  // 客户端启动时用它探测会话；未登录返回 401
  app.get('/auth/me', async (req) => {
    const user = await currentUser(req)
    if (!user) throw unauthenticated()
    return { user }
  })

  app.patch('/auth/password', { onRequest: requireAuth }, async (req, reply) => {
    const body = obj(req.body)
    const current = password(body.currentPassword)
    const next = password(body.newPassword)

    const found = await query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.userId],
    )
    const row = found.rows[0]
    if (!row || !verifyPassword(current, row.password_hash)) throw unauthenticated('当前密码不正确')

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(next), req.userId])
    // 改密后清掉该用户全部会话，强制重新登录
    await query('DELETE FROM sessions WHERE user_id = $1', [req.userId])
    clearSessionCookie(reply)
    return reply.code(204).send()
  })
}
