import type { FastifyRequest } from 'fastify'
import { query } from './db'
import { AppError } from './errors'

/**
 * 登录 / 重置密码的失败限流。
 *
 * 为什么需要它：scrypt 一次验证 38ms，2 核服务器约 53 次/秒，
 * 一天能试 450 万次。nginx 那层 limit_req 是按 IP 的 10r/s，
 * 对单账号定向爆破、或攻击者持有代理池时都拦不住。
 *
 * 设计取舍：
 * - 计数落库而不是放内存 —— systemd 重启 / 部署重启都会清空内存，
 *   攻击者等一个重启窗口就能重置计数。
 * - 邮箱和 IP 分开计数、阈值不同：
 *   邮箱阈值高（5 次 / 15 分钟）防定向爆破，但不会轻易锁死别人账号；
 *   IP 阈值低（20 次 / 15 分钟）防同一来源扫多个账号。
 * - 不告诉调用方「还剩几次」，只给统一的 429，避免帮助攻击者判断。
 */

/** 同邮箱连续失败上限 */
const EMAIL_MAX_FAILS = 5
/** 同 IP 连续失败上限 */
const IP_MAX_FAILS = 20
/** 统计窗口（分钟），也是锁定时长 */
const WINDOW_MINUTES = 15
/** 明细记录保留天数，超过就删。只为限流服务，不需要长期留存 */
const ATTEMPT_RETENTION_DAYS = 7

interface FailStats {
  emailFails: number
  ipFails: number
}

async function countFails(email: string, ip: string): Promise<FailStats> {
  const found = await query<{ email_fails: string; ip_fails: string }>(
    `SELECT
       count(*) FILTER (WHERE email = $1) AS email_fails,
       count(*) FILTER (WHERE ip    = $2) AS ip_fails
     FROM login_attempts
     WHERE succeeded = false
       AND created_at > now() - make_interval(mins => $3::int)
       AND (email = $1 OR ip = $2)`,
    [email, ip, WINDOW_MINUTES],
  )
  const row = found.rows[0]
  return {
    emailFails: Number(row?.email_fails ?? 0),
    ipFails: Number(row?.ip_fails ?? 0),
  }
}

/** 真实客户端 IP；Fastify 在开了 trustProxy 后会把 X-Forwarded-For 解释成 req.ip */
export function clientIp(req: FastifyRequest): string {
  return req.ip || 'unknown'
}

/**
 * 调用前检查：已经超限就直接抛 429，不再做 scrypt 计算。
 * 这一步同时省下攻击者的 CPU 消耗 —— 被拦住时服务端只花一次查询。
 */
export async function assertNotLocked(email: string, ip: string): Promise<void> {
  const { emailFails, ipFails } = await countFails(email, ip)
  if (emailFails >= EMAIL_MAX_FAILS) {
    throw new AppError(429, 'RATE_LIMITED', `该邮箱尝试次数过多，请 ${WINDOW_MINUTES} 分钟后再试`)
  }
  if (ipFails >= IP_MAX_FAILS) {
    throw new AppError(429, 'RATE_LIMITED', '请求过于频繁，请稍后再试')
  }
}

/** 记录一次尝试；成功时同时清掉该邮箱的历史失败，避免「错 4 次后登录成功仍被后续锁」 */
export async function recordAttempt(
  email: string,
  ip: string,
  succeeded: boolean,
): Promise<void> {
  await query('INSERT INTO login_attempts (email, ip, succeeded) VALUES ($1, $2, $3)', [
    email,
    ip,
    succeeded,
  ])

  if (succeeded) {
    await query('DELETE FROM login_attempts WHERE email = $1 AND succeeded = false', [email])
  }
}

/**
 * 顺手清理过期记录。绑在登录成功路径上，不额外开定时任务 ——
 * 失败路径不清理，因为攻击场景下那条路径恰恰最频繁。
 */
export async function pruneOldAttempts(): Promise<void> {
  await query(
    `DELETE FROM login_attempts WHERE created_at < now() - make_interval(days => $1::int)`,
    [ATTEMPT_RETENTION_DAYS],
  )
}
