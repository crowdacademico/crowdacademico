import { createContext } from 'react';

export type TipoToast = 'sucesso' | 'erro';

export interface ToastContextValue {
  mostrar: (titulo: string, descricao?: string, tipo?: TipoToast) => void;
}

// Separado de toast-provider.jsx/use-toast.js de propósito: um arquivo que
// só exporta componente (Fast Refresh do Vite exige isso pra recarregar
// certo em dev - misturar componente + hook/contexto no mesmo arquivo
// quebra o hot-reload).
export const ToastContext = createContext<ToastContextValue | null>(null);
