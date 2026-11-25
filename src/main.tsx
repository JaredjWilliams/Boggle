import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startVersionWatcher } from './lib/appVersion'
import { applyStoredTheme } from './theme/theme'

applyStoredTheme()
startVersionWatcher()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
