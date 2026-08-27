// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { createContext } from 'react';

// Separado de campo-testes-provider.jsx/use-campo-testes.js de propósito:
// mesma convenção de components/layout/toast-context.js (Fast Refresh do
// Vite exige que um arquivo com componente exporte só componente).
export const CampoTestesContext = createContext(null);
