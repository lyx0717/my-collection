#!/usr/bin/env node
/**
 * 忘密码时的离线重置工具。
 *
 *   node dist/reset.js <邮箱>          生成一次性重置链接（默认 15 分钟）
 *   node dist/reset.js <邮箱> --minutes 60
 *
 * 为什么是命令行而不是邮件：
 * 服务器没有 SMTP，接邮件要配授权码、处理退信，而且在华为云上发信容易被判垃圾邮件。
 * 只有自己用的场景，SSH 上去跑一条命令反而更快、更可控。
 *
 * 为什么输出「链接」而不是直接给新密码：
 * 链接由浏览器里的页面处理，密码不会经过终端历史、也不会被我自己看到。
 */
import { randomBytes } from 'node:crypto'
import { config } from '../config'
import { hashToken } from '../auth'
import { pool, query } from '../db'

const DEFAULT_MINUTES = 15

function usage(): never {
  console.error(`用法：
  node dist/reset.js <邮箱> [--minutes 15]

说明：
  生成一个一次性重置链接，默认 ${DEFAULT_MINUTES} 分钟有效。
  打开链接即可设置新密码，所有已登录会话会被登出。

示例：
  node dist/reset.js lyx0717@yeah.net
  node dist/reset.js lyx0717@yeah.net --minutes 60`)
  process.exit(1)
}

function parseArgs(argv: string[]): { email: string; minutes: number } {
  const rest = argv.slice(2)
  if (rest.length === 0 || rest[0] === '-h' || rest[0] === '--help') usage()

  const email = rest[0].trim().toLowerCase()
  if (!email.includes('@')) {
    console.error(`邮箱格式不正确：${email}`)
    usage()
  }

  let minutes = DEFAULT_MINUTES
  const flagAt = rest.indexOf('--minutes')
  if (flagAt !== -1) {
    const raw = rest[flagAt + 1]
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1440) {
      console.error('--minutes 必须是 1~1440 之间的整数')
      usage()
    }
    minutes = parsed
  }

  return { email, minutes }
}

async function main(): Promise<void> {
  const { email, minutes } = parseArgs(process.argv)

  const found = await query<{ id: string; email: string }>(
    'SELECT id, email FROM users WHERE lower(email) = $1',
    [email],
  )
  const user = found.rows[0]
  if (!user) {
    // 明确报错而不是静默成功：这是本机管理工具，不涉及「泄露邮箱是否注册」
    console.error(`找不到账号：${email}`)
    console.error('可用的账号：')
    const all = await query<{ email: string }>('SELECT email FROM users ORDER BY created_at')
    for (const row of all.rows) console.error(`  - ${row.email}`)
    process.exit(1)
  }

  // 作废该用户的旧令牌：避免多条链接同时有效
  await query('DELETE FROM password_resets WHERE user_id = $1', [user.id])

  const token = randomBytes(32).toString('base64url')
  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3::int))`,
    [user.id, hashToken(token), minutes],
  )

  // 生产用的是纯 http + IP，链接跟着 BASE_URL 走；没配就从 .env 推断不出来，直接用相对路径提示
  const base = config.publicBaseUrl
  const path = `/#/reset?token=${token}`
  const link = base ? `${base}${path}` : path

  console.log('')
  console.log(`账号：${user.email}`)
  console.log(`有效期：${minutes} 分钟（一次性，用后作废）`)
  console.log('')
  if (!base) {
    console.log('重置链接（当前环境未设置 PUBLIC_BASE_URL，需自行拼上站点地址）：')
    console.log(`  ${link}`)
  } else {
    console.log('重置链接：')
    console.log(`  ${link}`)
  }
  console.log('')
  console.log('注意：使用后该账号的全部登录会话都会被登出。')
}

main()
  .then(() => pool.end())
  .catch(async (err: unknown) => {
    console.error('重置失败：', err instanceof Error ? err.message : err)
    await pool.end()
    process.exit(1)
  })
