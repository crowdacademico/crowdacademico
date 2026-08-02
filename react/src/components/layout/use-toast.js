import { useContext } from 'react';
import { ToastContext } from './toast-context';

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error('useToast() precisa ser chamado dentro de <ToastProvider>.');
  }
  return contexto;
}
