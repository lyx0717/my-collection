import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './auth'

describe('密码哈希', () => {
  it('正确密码可以通过校验', () => {
    const stored = hashPassword('hunter2!')
    expect(verifyPassword('hunter2!', stored)).toBe(true)
  })

  it('错误密码被拒绝', () => {
    const stored = hashPassword('hunter2!')
    expect(verifyPassword('hunter3!', stored)).toBe(false)
  })

  it('同一密码两次哈希结果不同（盐随机）', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'))
  })

  it('存储格式非法时返回 false 而不是抛错', () => {
    expect(verifyPassword('x', '')).toBe(false)
    expect(verifyPassword('x', 'garbage')).toBe(false)
    expect(verifyPassword('x', 'bcrypt$1$2$3$abc$def')).toBe(false)
  })
})
