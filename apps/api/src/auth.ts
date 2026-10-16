import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthUser } from '@my-collection/shared/types'
import { config } from './config'
import { query } from './db'
import { unauthenticated } from './errors'

// OWASP 建议的下限；个人自用没必要调更高
const N = 16384
const R = 8
const P = 1
const KEY_LEN = 64
const SESSION_DAYS = 30

// __Host- 前缀要求 Secure + Path=/ + 无 Domain，因此只在 HTTPS 下启用
export const SESSION_COOKIE = config.cookieSecure ? '__Host-sid' : 'sid'

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, KEY_LEN, { N, r: R, p: P })
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [tag, n, r, p, salt, key] = stored.split('$')
  if (tag !== 'scrypt') return false
  const expected = Buffer.from(key, 'base64')
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  // 定长比较，避免逐字节提前返回泄露信息
  return timingSafeEqual(actual, expected)
}

export const hashToken = (token: string): Buffer => createHash('sha256').update(token).digest()

/** 建会话：原始 token 只写进 cookie，库里存 sha256 */
export async function startSession(reply: FastifyReply, userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3::int))`,
    [userId, hashToken(token), SESSION_DAYS],
  )
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    // Lax 而非 Strict：书签小工具是跨站顶级导航到 #/add，Strict 不会带上 cookie。
    // 这一条同时挡掉了 CSRF —— Lax 不会在跨站 POST/PUT/DELETE 上携带 cookie，
    // 因此不需要额外的 CSRF token 或 Origin 校验。
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' })
}

/** 当前登录用户；无有效会话返回 null */
export async function currentUser(req: FastifyRequest): Promise<AuthUser | null> {
  const token = req.cookies[SESSION_COOKIE]
  if (!token) return null
  const found = await query<AuthUser>(
    `SELECT u.id, u.email, u.created_at AS "createdAt"
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  )
  return found.rows[0] ?? null
}

/** 受保护路由的 onRequest 钩子：解出 userId 挂到 req 上，否则 401 */
export async function requireAuth(req: FastifyRequest): Promise<void> {
  const token = req.cookies[SESSION_COOKIE]
  if (!token) throw unauthenticated()
  const found = await query<{ user_id: string }>(
    'SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()',
    [hashToken(token)],
  )
  const row = found.rows[0]
  if (!row) throw unauthenticated()
  req.userId = row.user_id
}

declare module 'fastify' {
  interface FastifyRequest {
    /** 由 requireAuth 钩子填充 */
    userId: string
  }
}
