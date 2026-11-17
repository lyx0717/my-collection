import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ResetPage from './pages/ResetPage'
import AddRouteGate from './components/AddRouteGate'
import RequireAuth from './components/RequireAuth'

// 设置页低频访问：路由级懒加载，把 papaparse 等导入依赖从首屏主包里剥出去
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* 重置页必须放在 RequireAuth 之外：忘密码时本来就没登录态 */}
        <Route path="/reset" element={<ResetPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Suspense fallback={null}>
                <SettingsPage />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="*"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
      </Routes>
      <AddRouteGate />
    </>
  )
}
