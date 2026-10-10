import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import './index.css'
import App from './App'
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
        <BookmarksProvider>
          <ToastProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </ToastProvider>
        </BookmarksProvider>
        </AppearanceProvider>
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
)
