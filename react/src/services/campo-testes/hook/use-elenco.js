// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useContext } from 'react';
import { ElencoContext } from '../context/elenco-context';

// Separado de elenco-context.jsx de propósito: react-refresh (Fast
// Refresh do Vite) exige que um arquivo com componente exporte só
// componente; hook mora no próprio arquivo em separado, mesma convenção
// de services/3-auth/hook/use-auth.js.
export function useElenco() {
  const contexto = useContext(ElencoContext);
  if (!contexto) {
    throw new Error('useElenco() só funciona dentro de <ElencoProvider>.');
  }
  return contexto;
}
