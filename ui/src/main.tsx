import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'
import '@/index.css'
import { applyAppTheme, getAppTheme } from '@/lib/app-theme'
import { registerPwaServiceWorker } from '@/lib/register-pwa-service-worker'
import { initPwaInstallPromptCapture } from '@/services/pwa-install'

applyAppTheme(getAppTheme())
initPwaInstallPromptCapture()
registerPwaServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
