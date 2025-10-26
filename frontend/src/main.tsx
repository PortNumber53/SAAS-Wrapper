import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import useAppStore from './store/app'
import { ToastProvider } from './components/ToastProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Boot />
        <App />
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
)

function Boot() {
  // Preload common app data to reduce on-page lazy loading
  useEffect(() => {
    const s = useAppStore.getState()
    s.loadSession()
    s.loadPrefs()
    s.loadAgentSettings()
    s.loadGeminiKey()
  }, [])
  return null
}
