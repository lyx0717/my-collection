import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../store/AuthContext'

/** 未登录一律跳登录页；深链放 history state 而不是 URL，避免参数被二次编码 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas text-ink3">
        <Loader2 size={26} className="animate-spin text-accent" />
        <p className="text-[13px]">正在加载…</p>
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}
