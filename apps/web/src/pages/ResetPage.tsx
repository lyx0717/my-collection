import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ApiError, api } from '../lib/api'

/**
 * 密码重置页。
 *
 * 令牌不是用户自己申请的 —— 服务器上跑 `node dist/reset.js <邮箱>` 生成，
 * 所以这里不做「发邮件」的入口，只负责把链接里的 token 换成新密码。
 *
 * 两种状态：
 *   1. 校验中 / 令牌无效 → 只说怎么重新生成，不给表单（避免白填一次）
 *   2. 令牌有效 → 显示邮箱 + 新密码表单
 */
export default function ResetPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [phase, setPhase] = useState<'checking' | 'ready' | 'invalid'>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setPhase('invalid')
      return
    }
    let alive = true
    api
      .get<{ email: string }>(`/auth/reset?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!alive) return
        setEmail(res.email)
        setPhase('ready')
      })
      .catch(() => {
        if (alive) setPhase('invalid')
      })
    return () => {
      alive = false
    }
  }, [token])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }

    setBusy(true)
    try {
      await api.post('/auth/reset', { token, newPassword: password })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '网络异常，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-[380px] rounded-[20px] border p-7">
        <div className="mb-6 flex items-center gap-2.5">
          <img
            src="./avatar-112.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-[10px] object-cover shadow-[0_4px_12px_-4px_var(--accent-shadow)]"
          />
          <span className="text-[15px] font-bold">狗蛋书签</span>
        </div>

        {done ? (
          <>
            <p className="text-[13.5px] leading-6 text-ink2">
              密码已更新，所有旧设备都已退出登录。
            </p>
            <Link
              to="/login"
              className="mt-5 flex h-10 items-center justify-center rounded-[10px] bg-accent text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-ink"
            >
              去登录
            </Link>
          </>
        ) : phase === 'invalid' ? (
          <>
            <p className="text-[13.5px] leading-6 text-ink2">链接已失效。</p>
            <p className="mt-2 text-[11.5px] leading-5 text-ink3">
              重置链接 15 分钟内有效且只能用一次。在服务器上重新生成：
            </p>
            <code className="mt-2 block rounded-[8px] bg-surface-2 px-3 py-2 font-mono text-[11.5px] text-ink2">
              node dist/reset.js 你的邮箱
            </code>
            <Link to="/login" className="mt-5 block text-[12.5px] font-medium text-accent-ink">
              返回登录
            </Link>
          </>
        ) : phase === 'checking' ? (
          <div className="flex h-20 items-center justify-center text-ink3">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <p className="text-[12.5px] leading-5 text-ink3">
              正在为 <span className="font-medium text-ink2">{email}</span> 设置新密码。
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-ink3">新密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                autoFocus
                className="glass-field h-10 rounded-[10px] border px-3 text-[13.5px]"
                placeholder="至少 6 位"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-ink3">再输一次</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                className="glass-field h-10 rounded-[10px] border px-3 text-[13.5px]"
                placeholder="确认新密码"
              />
            </label>

            {error && <p className="text-[12.5px] text-danger">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-ink disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              设置新密码
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
