import { createContext } from 'react';

// `aviso`: a ação deu certo, mas pede atenção (ex.: a pontuação caiu). Laranja, não vermelho: não é erro.
export type TipoToast = 'sucesso' | 'aviso' | 'erro';

export interface ToastContextValue {
  mostrar: (titulo: string, descricao?: string, tipo?: TipoToast) => void;
}

// Separado de toast-provider.tsx/use-toast.js de propósito: um arquivo que
// só exporta componente (Fast Refresh do Vite exige isso pra recarregar
// certo em dev - misturar componente + hook/contexto no mesmo arquivo
// quebra o hot-reload).
export const ToastContext = createContext<ToastContextValue | null>(null);
