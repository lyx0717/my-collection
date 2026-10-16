import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// 本地开发读仓库根的 .env（唯一配置源）；线上由环境变量直接提供，没有这个文件。
if (!process.env.DATABASE_URL) {
  const envFile = fileURLToPath(new URL('../../../.env', import.meta.url))
  if (existsSync(envFile)) process.loadEnvFile(envFile)
}

function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`缺少环境变量 ${key}`)
  return value
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '127.0.0.1',
  // 纯 http 访问时必须为 false，否则浏览器不会保存 cookie，登录会静默失败
  cookieSecure: process.env.COOKIE_SECURE === 'true',
}
