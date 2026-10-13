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

// Só o que as telas do Campo de Testes compartilham entre si: o Registro de Chamadas.
export interface CampoTestesContextValue {
  registroChamadas: RegistroChamada[];
  registrarChamada: (entrada: EntradaRegistroChamada) => void;
  limparRegistro: () => void;
}

// Separado de campo-testes-provider.tsx e use-campo-testes.ts: o recarregamento rápido do Vite exige que um
// arquivo com componente exporte só componente.
export const CampoTestesContext = createContext<CampoTestesContextValue | null>(null);
