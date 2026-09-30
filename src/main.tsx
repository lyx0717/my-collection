import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { BookmarksProvider } from './store/BookmarksContext'
import { AppearanceProvider } from './store/AppearanceContext'
import { ProfileProvider } from './store/ProfileContext'
import { ToastProvider } from './components/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceProvider>
      <ProfileProvider>
        <BookmarksProvider>
          <ToastProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </ToastProvider>
        </BookmarksProvider>
      </ProfileProvider>
    </AppearanceProvider>
  </StrictMode>,
)
