import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import BookmarkModal from './BookmarkModal'
import { useAuth } from '../store/AuthContext'

/** 处理 #/add?u=&t= 深链（书签小工具入口），在任意页面都能拉起添加弹窗 */
export default function AddRouteGate() {
  const location = useLocation()
  const navigate = useNavigate()
  const { status } = useAuth()

  if (location.pathname !== '/add') return null

  // 未登录时先把深链存进 history state 再跳登录，登录成功后原样回来。
  // 走 state 而不是 URL，u/t 不会被二次编码。
  if (status === 'loading') return null
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  const params = new URLSearchParams(location.search)
  const u = params.get('u') ?? ''
  const t = params.get('t') ?? ''
  if (!u) {
    navigate('/', { replace: true })
    return null
  }
  return (
    <BookmarkModal
      preset={{ url: u, title: t || undefined }}
      fromBookmarklet
      onClose={() => navigate('/', { replace: true })}
    />
  )
}
