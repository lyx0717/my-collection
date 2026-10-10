import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'
import AddRouteGate from './components/AddRouteGate'
import { ClotheslinePage } from './pages/ClotheslinePage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* 晾衣绳 3D 原型，独立入口，不影响原有页面 */}
        <Route path="/clothesline" element={<ClotheslinePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <AddRouteGate />
    </>
  )
}
