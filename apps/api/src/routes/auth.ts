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
import { badRequest, conflict, unauthenticated } from '../errors'
import { assertNotLocked, clientIp, pruneOldAttempts, recordAttempt } from '../ratelimit'
import { email, obj, password, str } from '../validate'

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
    const ip = clientIp(req)

    // 先查限流再算 scrypt：被锁时服务端只花一次索引查询，不给攻击者烧 CPU
    await assertNotLocked(mail, ip)

    const found = await query<AuthUser & { password_hash: string }>(
      `SELECT id, email, created_at AS "createdAt", password_hash
       FROM users WHERE lower(email) = $1`,
      [mail],
    )
    const row = found.rows[0]
    // 账号不存在与密码错误给同一句提示，不泄露邮箱是否注册过
    if (!row || !verifyPassword(pass, row.password_hash)) {
      // 账号不存在也记一笔，否则「哪个邮箱已注册」就能靠限流行为探测出来
      await recordAttempt(mail, ip, false)
      throw unauthenticated('邮箱或密码不正确')
    }

    await recordAttempt(mail, ip, true)

    // 顺手清掉过期会话和过期失败记录，省掉一个定时任务
    await query('DELETE FROM sessions WHERE expires_at < now()')
    await pruneOldAttempts()
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
    // 当前密码不对是「输入错」不是「没登录」：身份已由 requireAuth 确认，
    // 返回 401 会让前端 api.ts 把用户当会话失效静默踢下线，看不到原因
    if (!row || !verifyPassword(current, row.password_hash)) throw badRequest('当前密码不正确')

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(next), req.userId])
    // 改密后清掉该用户全部会话，强制重新登录
    await query('DELETE FROM sessions WHERE user_id = $1', [req.userId])
    clearSessionCookie(reply)
    return reply.code(204).send()
  })

  // ── 密码重置 ────────────────────────────────────────────────
  // 令牌由服务器命令行 `node dist/reset.js <邮箱>` 生成，不经邮件，也就不必防「发信接口被滥用」。
  // 因此这两个接口只做纯校验，不加限流 —— 令牌本身 256 位随机，暴力猜不出来。

  // 打开重置链接时先校验一次，前端据此决定显示表单还是「链接已失效」
  app.get('/auth/reset', async (req) => {
    const token = str((req.query as Record<string, unknown>).token, '令牌', 200)
    const found = await query<{ email: string }>(
      `SELECT u.email FROM password_resets r JOIN users u ON u.id = r.user_id
       WHERE r.token_hash = $1 AND r.expires_at > now()`,
      [hashToken(token)],
    )
    const row = found.rows[0]
    if (!row) throw badRequest('链接已失效，请重新生成')
    return { email: row.email }
  })

  app.post('/auth/reset', async (req, reply) => {
    const body = obj(req.body)
    const token = str(body.token, '令牌', 200)
    const next = password(body.newPassword)

    const found = await query<{ user_id: string }>(
      `SELECT user_id FROM password_resets WHERE token_hash = $1 AND expires_at > now()`,
      [hashToken(token)],
    )
    const row = found.rows[0]
    if (!row) throw badRequest('链接已失效，请重新生成')

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(next), row.user_id])
    // 一次性：用掉即删，同一链接无法二次使用
    await query('DELETE FROM password_resets WHERE token_hash = $1', [hashToken(token)])
    // 和改密一致：踢掉所有旧会话
    await query('DELETE FROM sessions WHERE user_id = $1', [row.user_id])
    clearSessionCookie(reply)
    return reply.code(204).send()
  })
}
