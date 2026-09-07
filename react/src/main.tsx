import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ToastProvider } from './components/layout/toast-provider'
import { ConfiguracoesProvider } from './services/11-configuracoes/context/configuracoes-provider'
import './assets/css/tailwind-theme.css'
import './assets/css/0-style.css'
import App from './App'

const elementoRaiz = document.getElementById('root')
if (!elementoRaiz) {
  throw new Error('Elemento #root não encontrado em index.html.')
}

createRoot(elementoRaiz).render(
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
