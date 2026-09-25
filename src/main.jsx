import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initTheme } from '@/lib/theme'
import { AuthProvider } from '@/context/auth-context'
import { App } from './App.jsx'
import './index.css'

initTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
