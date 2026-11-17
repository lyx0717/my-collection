import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAuth } from '../store/AuthContext'

/** 登录与注册合一：账号不存在时服务端直接建号，前端只留一次提交 */
export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // 登录后的落点只认书签小工具的 /add 深链（经 history state 带过来，
  // 里面的 u/t 不会被二次编码）；其余入口一律回首页。
  // 之前直接沿用任意 from，导致访客从 #/settings 之类的内页被踢去登录后，
  // 会在登录成功的一瞬间被塞进设置页 —— 那不是他要去的地方，只是他恰好点到的页面。
  const requested = (location.state as { from?: string } | null)?.from
  const from = requested?.startsWith('/add') ? requested : '/'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
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

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-ink3">邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="glass-field h-10 rounded-[10px] border px-3 text-[13.5px]"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-ink3">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
              className="glass-field h-10 rounded-[10px] border px-3 text-[13.5px]"
              placeholder="至少 6 位"
            />
          </label>

          {error && <p className="text-[12.5px] text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="liquid-glass liquid-glass--accent mt-1 flex h-10 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            登录
          </button>
        </form>

        <p className="mt-4 text-[11.5px] leading-5 text-ink3">
          首次使用会自动创建账号，邮箱和密码要记住。
        </p>

        {/* 忘密码没有自助找回：本站不发邮件，链接要在服务器上生成。
            折叠起来，不占主要视线。 */}
        <details className="mt-3 text-[11.5px] leading-5 text-ink3">
          <summary className="cursor-pointer select-none hover:text-ink2">忘记密码？</summary>
          <p className="mt-1.5">
            在服务器上执行{' '}
            <code className="rounded-[4px] bg-surface-2 px-1 py-0.5 font-mono text-[11px] text-ink2">
              node dist/reset.js 你的邮箱
            </code>{' '}
            会得到一个 15 分钟内有效的重置链接。
          </p>
        </details>
      </div>
    </div>
  )
}
