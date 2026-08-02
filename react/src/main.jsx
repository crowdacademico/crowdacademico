import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ToastProvider } from './components/layout/toast-provider'
import { ConfiguracoesProvider } from './services/11-configuracoes/provider/configuracoes-provider'
import './assets/css/tailwind-theme.css'
import './assets/css/0-style.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ConfiguracoesProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ConfiguracoesProvider>
    </BrowserRouter>
  </StrictMode>,
)
