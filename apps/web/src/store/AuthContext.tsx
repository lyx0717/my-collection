import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '@my-collection/shared/types'
import { api, setUnauthorizedHandler } from '../lib/api'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // 任何请求收到 401 都把状态打回未登录，守卫据此跳登录页
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setStatus('anonymous')
    })
  }, [])

  // 启动时探一次会话，决定进书签库还是登录页
  useEffect(() => {
    let cancelled = false
    void api
      .get<{ user: AuthUser }>('/auth/me')
      .then((res) => {
        if (cancelled) return
        setUser(res.user)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: AuthUser }>('/auth/login', { email, password })
    setUser(res.user)
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: AuthUser }>('/auth/register', { email, password })
    setUser(res.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.patch('/auth/password', { currentPassword, newPassword })
    // 服务端已清掉该用户全部会话，本地同步登出
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, changePassword }),
    [user, status, login, register, logout, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
