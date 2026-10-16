import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import './index.css'
import App from './App'
import { AuthProvider } from './store/AuthContext'
import { BookmarksProvider } from './store/BookmarksContext'
import { AppearanceProvider } from './store/AppearanceContext'
import { ToastProvider } from './components/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user"：系统开启「减少动态」时，所有位移/缩放自动降级为纯淡入 */}
    <MotionConfig reducedMotion="user">
      {/* domAnimation 按需加载：避免把 motion 全量 runtime 打进产物 */}
      <LazyMotion features={domAnimation} strict>
      <AppearanceProvider>
        {/* AuthProvider 必须在 BookmarksProvider 外层：书签库是按账号拉的 */}
        <AuthProvider>
          <BookmarksProvider>
            <ToastProvider>
              <HashRouter>
                <App />
              </HashRouter>
            </ToastProvider>
          </BookmarksProvider>
        </AuthProvider>
        </AppearanceProvider>
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
)
