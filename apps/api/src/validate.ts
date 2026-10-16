import { badRequest } from './errors'

/** 请求体必须是普通对象 */
export function obj(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw badRequest('请求体格式不正确')
  return value as Record<string, unknown>
}

/** 非空字符串，去首尾空白，超长直接拒绝 */
export function str(value: unknown, field: string, max = 2000): string {
  if (typeof value !== 'string' || !value.trim()) throw badRequest(`${field}不能为空`)
  const text = value.trim()
  if (text.length > max) throw badRequest(`${field}过长`)
  return text
}

/** 可选字符串：空串 / null / undefined 一律归一为 undefined */
export function optStr(value: unknown, field: string, max = 2000): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return str(value, field, max)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function uuid(value: unknown, field: string): string {
  const text = str(value, field, 64)
  if (!UUID_RE.test(text)) throw badRequest(`${field}格式不正确`)
  return text
}

export function optUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return uuid(value, field)
}

export function uuidArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw badRequest(`${field}必须是数组`)
  return value.map((item) => uuid(item, field))
}

/** 只做最低限度检查：不做 RFC 校验，也不发验证邮件 */
export function email(value: unknown): string {
  const text = str(value, '邮箱', 200).toLowerCase()
  if (!text.includes('@')) throw badRequest('邮箱格式不正确')
  return text
}

export function password(value: unknown): string {
  const text = typeof value === 'string' ? value : ''
  if (text.length < 6) throw badRequest('密码至少 6 位')
  if (text.length > 200) throw badRequest('密码过长')
  return text
}
