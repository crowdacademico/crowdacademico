// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useCallback, useMemo, useState } from 'react';
import { CampoTestesContext } from './campo-testes-context';

const LIMITE_REGISTRO_CHAMADAS = 200;

// Substitui o antigo ElencoProvider (25-08-2026, pedido do Lucas: "remover
// de vez" o motor de login-múltiplo — nenhum endpoint do backend aceita
// agir "em nome de" outro usuário, então simular vários atores ao mesmo
// tempo não tinha mais sustentação real). Só guarda estado compartilhado
// entre T1/T2/T3/T4, sem nenhuma sessão paralela: toda chamada de rede do
// Campo de Testes passa a usar a MESMA sessão real do painel (`auth`,
// prop já recebida por toda tela).
//
// `pesquisadorSelecionado`: escolhido em T1 (Bancada do Pesquisador),
// usado por T2 (Bancada da Campanha) pra filtrar a tabela de campanhas por
// dono e mostrar quem está selecionado.
// `campanhaFoco`: escolhida em T2 (coluna "Escolher"), usada por T3 (Vida
// da Campanha Ativa) pra saber de qual campanha continuar. Mesmo conceito
// de antes, só que sem depender do Elenco.
// `registroChamadas`: alimentado por use-chamada-registrada.js — T4
// continua existindo, só que com um único "ator" possível agora (quem
// estiver realmente logado).
export function CampoTestesProvider({ children }) {
  const [pesquisadorSelecionado, setPesquisadorSelecionado] = useState(null);
  const [campanhaFoco, setCampanhaFoco] = useState(null);
  const [registroChamadas, setRegistroChamadas] = useState([]);

  const limparPesquisadorSelecionado = useCallback(() => setPesquisadorSelecionado(null), []);
  const limparCampanhaFoco = useCallback(() => setCampanhaFoco(null), []);

  const registrarChamada = useCallback((entrada) => {
    setRegistroChamadas((atual) => {
      const proxima = [{ id: crypto.randomUUID(), hora: new Date(), ...entrada }, ...atual];
      return proxima.slice(0, LIMITE_REGISTRO_CHAMADAS);
    });
  }, []);

  const limparRegistro = useCallback(() => setRegistroChamadas([]), []);

  const valor = useMemo(
    () => ({
      pesquisadorSelecionado,
      selecionarPesquisador: setPesquisadorSelecionado,
      limparPesquisadorSelecionado,
      campanhaFoco,
      selecionarCampanhaFoco: setCampanhaFoco,
      limparCampanhaFoco,
      registroChamadas,
      registrarChamada,
      limparRegistro,
    }),
    [pesquisadorSelecionado, limparPesquisadorSelecionado, campanhaFoco, limparCampanhaFoco, registroChamadas, registrarChamada, limparRegistro],
  );

  return <CampoTestesContext.Provider value={valor}>{children}</CampoTestesContext.Provider>;
}
