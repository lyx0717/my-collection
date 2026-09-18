import { useLocation, useNavigate } from 'react-router-dom'
import BookmarkModal from './BookmarkModal'

/** 处理 #/add?u=&t= 深链（书签小工具入口），在任意页面都能拉起添加弹窗 */
export default function AddRouteGate() {
  const location = useLocation()
  const navigate = useNavigate()

  if (location.pathname !== '/add') return null
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
