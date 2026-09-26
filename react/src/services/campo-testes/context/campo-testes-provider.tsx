// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CampoTestesContext } from './campo-testes-context';
import type { EntradaRegistroChamada, RegistroChamada } from './campo-testes-context';

const LIMITE_REGISTRO_CHAMADAS = 200;

interface CampoTestesProviderProps {
  children: ReactNode;
}

// Só guarda estado compartilhado entre telas, sem nenhuma sessão paralela: nenhum endpoint do backend aceita
// agir "em nome de" outro usuário, então toda chamada de rede do Campo de Testes usa a MESMA sessão real do
// painel (`auth`, prop já recebida por toda tela).
//
// `registroChamadas`: alimentado por use-chamada-registrada.ts; T4 (Registro de Chamadas) tem um único "ator"
// possível (quem estiver realmente logado).
//
// SEM `pesquisadorSelecionado` NEM `campanhaFoco` (ver campo-testes-context.ts): eram alimentados por uma
// coluna "Escolher" que não existe mais em T1 nem em T2. Este provider só compartilha o que sobra de verdade
// entre telas: o Registro de Chamadas.
export function CampoTestesProvider({ children }: CampoTestesProviderProps) {
  const [registroChamadas, setRegistroChamadas] = useState<RegistroChamada[]>([]);

  const registrarChamada = useCallback((entrada: EntradaRegistroChamada) => {
    setRegistroChamadas((atual) => {
      const proxima: RegistroChamada[] = [
        { id: crypto.randomUUID(), hora: new Date(), ...entrada },
        ...atual,
      ];
      return proxima.slice(0, LIMITE_REGISTRO_CHAMADAS);
    });
  }, []);

  const limparRegistro = useCallback(() => setRegistroChamadas([]), []);

  const valor = useMemo(
    () => ({
      registroChamadas,
      registrarChamada,
      limparRegistro,
    }),
    [registroChamadas, registrarChamada, limparRegistro],
  );

  return <CampoTestesContext.Provider value={valor}>{children}</CampoTestesContext.Provider>;
}
