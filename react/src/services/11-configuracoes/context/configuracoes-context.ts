import { createContext } from 'react';

export type ValorConfiguracao = string | number | boolean;

export interface ConfiguracoesContextValue {
  carregando: boolean;
  erro: Error | null;
  obterConfiguracao: (chave: string, valorPadrao: ValorConfiguracao) => ValorConfiguracao | null;
}

// Separado de configuracoes-provider.jsx/use-configuracoes.js de propósito
// (mesmo motivo do toast-context.js): Fast Refresh do Vite quebra o
// hot-reload quando um arquivo mistura componente e hook/contexto.
export const ConfiguracoesContext = createContext<ConfiguracoesContextValue | null>(null);
