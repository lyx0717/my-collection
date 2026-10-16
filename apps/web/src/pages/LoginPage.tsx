import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bookmark, Loader2 } from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAuth } from '../store/AuthContext'

type Mode = 'login' | 'register'

/** 登录与注册合一：个人自用，两个表单字段完全一样，没必要拆成两页 */
export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // 书签小工具的深链经 history state 带过来，登录后原样回去
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email.trim(), password)
      else await register(email.trim(), password)
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
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent shadow-[0_4px_12px_-4px_var(--accent-shadow)]">
            <Bookmark size={15} className="text-white" fill="white" />
          </span>
          <span className="text-[15px] font-bold">我的书签</span>
        </div>

        <div className="mb-5 flex rounded-[10px] bg-segment p-[3px]">
          {(['login', 'register'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item)
                setError('')
              }}
              className={`flex-1 rounded-[7px] py-1.5 text-[12.5px] font-medium transition-colors ${
                mode === item ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(30,40,60,.12)]' : 'text-ink3'
              }`}
            >
              {item === 'login' ? '登录' : '注册'}
            </button>
          ))}
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
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
            className="mt-1 flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-ink disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>

        <p className="mt-4 text-[11.5px] leading-5 text-ink3">
          {mode === 'login'
            ? '还没有账号？切到「注册」，只要邮箱和密码。'
            : '注册后即为登录状态，书签保存在你自己的服务器上。'}
        </p>
      </div>
    </div>
  )
}
