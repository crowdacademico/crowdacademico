// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { createContext } from 'react';

export interface EntradaRegistroChamada {
  metodo: string;
  caminho: string;
  status: number;
  ms: number;
  corpoEnviado: unknown;
  corpoRecebido: unknown;
  ok: boolean;
}

export interface RegistroChamada extends EntradaRegistroChamada {
  id: string;
  hora: Date;
}

// SEM `pesquisadorSelecionado` (removido 12-09-2026) NEM `campanhaFoco`
// (removido 13-09-2026) - os dois eram estado de "seleção compartilhada
// entre telas", alimentados por colunas "Escolher" que não existem mais em
// nenhum lugar (T1 e T2 respectivamente); T2 dobrou seu próprio "campanha
// em foco" pra dentro do modal de Alterar, e T3 ganhou busca própria (ver
// vida-campanha-ativa.tsx). Só sobra o que realmente precisa ser
// compartilhado entre telas: o Registro de Chamadas (T4).
export interface CampoTestesContextValue {
  registroChamadas: RegistroChamada[];
  registrarChamada: (entrada: EntradaRegistroChamada) => void;
  limparRegistro: () => void;
}

// Separado de campo-testes-provider.tsx/use-campo-testes.js de propósito:
// mesma convenção de components/layout/toast-context.js (Fast Refresh do
// Vite exige que um arquivo com componente exporte só componente).
export const CampoTestesContext = createContext<CampoTestesContextValue | null>(null);
