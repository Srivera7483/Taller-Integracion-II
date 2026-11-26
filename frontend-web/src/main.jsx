import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { iniciarSincronizacionAutomatica } from './services/sync/syncManager'

// TAL-170: Registro automático inmediato del Service Worker de la PWA
registerSW({ immediate: true })

// TAL-196: Sincronización automática de la cola offline (Background Sync con fallback en primer plano)
iniciarSincronizacionAutomatica()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
