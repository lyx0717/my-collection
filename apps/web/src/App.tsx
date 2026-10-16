import { Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import HomePage from './pages/HomePage'
import AddRouteGate from './components/AddRouteGate'

// 设置页低频访问：路由级懒加载，把 papaparse 等导入依赖从首屏主包里剥出去
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/settings"
          element={
            <Suspense fallback={null}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <AddRouteGate />
    </>
  )
}
