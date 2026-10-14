import { useContext } from 'react';
import { CampoTestesContext } from '../context/campo-testes-context';
import type { CampoTestesContextValue } from '../context/campo-testes-context';

// Hook em arquivo próprio (recarregamento rápido do Vite), como use-auth.ts.
export function useCampoTestes(): CampoTestesContextValue {
  const contexto = useContext(CampoTestesContext);
  if (!contexto) {
    throw new Error('useCampoTestes() só funciona dentro de <CampoTestesProvider>.');
  }
  return contexto;
}
