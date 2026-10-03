import { createContext } from 'react';

export type ValorConfiguracao = string | number | boolean;

export interface ConfiguracoesContextValue {
  carregando: boolean;
  erro: Error | null;
  obterConfiguracao: (chave: string, valorPadrao: ValorConfiguracao) => ValorConfiguracao | null;
  // Parâmetro numérico (limite, prazo, valor mínimo): o padrão também vale quando a linha não é número.
  obterNumero: (chave: string, valorPadrao: number) => number;
}

// Separado de configuracoes-provider.tsx/use-configuracoes.js de propósito
// (mesmo motivo do toast-context.js): Fast Refresh do Vite quebra o
// hot-reload quando um arquivo mistura componente e hook/contexto.
export const ConfiguracoesContext = createContext<ConfiguracoesContextValue | null>(null);
