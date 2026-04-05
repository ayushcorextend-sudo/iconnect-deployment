import './lib/sentry';
import './lib/pwaInstallManager'; // capture beforeinstallprompt ASAP (before React mounts)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Auto-reload when a new service worker version is deployed
registerSW({
  onNeedRefresh() {
    // New version available — reload immediately (skipWaiting already activated it)
    window.location.reload()
  },
  onOfflineReady() {},
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Signal the app-shell splash in index.html to fade out now that React has mounted.
// Uses a double rAF so the first real paint lands before we dismiss the shell.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('app-ready'))
  })
})
