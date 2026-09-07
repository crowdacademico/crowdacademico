// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { createContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';

// Selecionado em T1 (Bancada do Pesquisador) - não é o PerfilPesquisadorResponse
// inteiro, só o recorte que T2/T3 realmente usam pra filtrar/mostrar (ver
// bancada-pesquisador.jsx, selecionarPesquisador()).
export interface PesquisadorSelecionado {
  idUsuario: number;
  nome: string;
  email: string;
}

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

export interface CampoTestesContextValue {
  pesquisadorSelecionado: PesquisadorSelecionado | null;
  selecionarPesquisador: Dispatch<SetStateAction<PesquisadorSelecionado | null>>;
  limparPesquisadorSelecionado: () => void;
  campanhaFoco: number | null;
  selecionarCampanhaFoco: Dispatch<SetStateAction<number | null>>;
  limparCampanhaFoco: () => void;
  registroChamadas: RegistroChamada[];
  registrarChamada: (entrada: EntradaRegistroChamada) => void;
  limparRegistro: () => void;
}

// Separado de campo-testes-provider.jsx/use-campo-testes.js de propósito:
// mesma convenção de components/layout/toast-context.js (Fast Refresh do
// Vite exige que um arquivo com componente exporte só componente).
export const CampoTestesContext = createContext<CampoTestesContextValue | null>(null);
