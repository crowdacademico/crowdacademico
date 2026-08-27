// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useContext } from 'react';
import { CampoTestesContext } from '../context/campo-testes-context';

// Separado de campo-testes-context.js de propósito: react-refresh (Fast
// Refresh do Vite) exige que um arquivo com componente exporte só
// componente; hook mora no próprio arquivo em separado, mesma convenção
// de services/3-auth/hook/use-auth.js.
export function useCampoTestes() {
  const contexto = useContext(CampoTestesContext);
  if (!contexto) {
    throw new Error('useCampoTestes() só funciona dentro de <CampoTestesProvider>.');
  }
  return contexto;
}
