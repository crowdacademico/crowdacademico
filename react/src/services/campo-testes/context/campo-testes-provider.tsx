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

// Substitui o antigo ElencoProvider (25-08-2026, pedido do Lucas: "remover
// de vez" o motor de login-múltiplo - nenhum endpoint do backend aceita
// agir "em nome de" outro usuário, então simular vários atores ao mesmo
// tempo não tinha mais sustentação real). Só guarda estado compartilhado
// entre telas, sem nenhuma sessão paralela: toda chamada de rede do Campo
// de Testes passa a usar a MESMA sessão real do painel (`auth`, prop já
// recebida por toda tela).
//
// `registroChamadas`: alimentado por use-chamada-registrada.js - T4
// (Registro de Chamadas) continua existindo, só que com um único "ator"
// possível agora (quem estiver realmente logado).
//
// SEM `pesquisadorSelecionado` (removido 12-09-2026 - única fonte era a
// coluna "Escolher" de T1) NEM `campanhaFoco` (removido 13-09-2026 - única
// fonte era a coluna "Escolher" de T2) - os dois eram estado de "seleção
// compartilhada entre telas" alimentado por uma coluna que não existe mais
// em nenhum dos dois lugares. Este provider hoje só compartilha o que
// sobra de verdade entre telas: o Registro de Chamadas.
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
