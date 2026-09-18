import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'
import AddRouteGate from './components/AddRouteGate'
import AppGate from './components/AppGate'

export default function App() {
  return (
    <AppGate>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <AddRouteGate />
    </AppGate>
  )
}
