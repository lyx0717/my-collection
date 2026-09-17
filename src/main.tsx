import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { CollectionProvider } from './store/CollectionContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CollectionProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </CollectionProvider>
  </StrictMode>,
)
