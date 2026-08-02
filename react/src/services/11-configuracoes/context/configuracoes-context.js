import { createContext } from 'react';

// Separado de configuracoes-provider.jsx/use-configuracoes.js de propósito
// (mesmo motivo do toast-context.js): Fast Refresh do Vite quebra o
// hot-reload quando um arquivo mistura componente e hook/contexto.
export const ConfiguracoesContext = createContext(null);
