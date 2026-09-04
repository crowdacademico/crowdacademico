import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Tailwind saiu do <script> CDN do index.html (achado do Claude Web,
  // 02-08-2026: dist/ não continha NENHUMA classe Tailwind, tudo era
  // gerado em runtime pelo navegador baixando o CDN - quebra sem rede,
  // não deveria ir pra produção nunca). Plugin oficial: gera o CSS de
  // verdade no build, bundle fica autossuficiente.
  plugins: [react(), tailwindcss()],
})
