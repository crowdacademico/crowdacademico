import { useEffect, useState } from 'react';
import { useErroToast } from '../../../components/layout/toast/use-erro-toast';

// Extraído (14-09-2026, pedido do Lucas na auditoria de componentes) - o
// par "buscar por id, mostrar Carregando enquanto não chega, mostrar erro
// se falhar" estava reescrito em 14 telas (toda Consultar/Alterar/Excluir
// de área de conhecimento, configuração, motivo de denúncia, tipo de
// link, papel) - sempre o MESMO `useEffect` + par de estados, cada uma
// com sua própria chance de esquecer o `.catch`/`.finally` ou escrever o
// texto de erro um pouco diferente.
//
// `carregando` começa `true` e só vira `false` no `.finally` - NUNCA
// reiniciado dentro do efeito (evitaria o lint `react-hooks/set-state-in-
// effect`, e também não faz sentido aqui: `id` normalmente só muda por
// causa de uma navegação nova, que já remonta a página do zero).
export function useBuscarPorId<T>(buscar: (id: string) => Promise<T>, id: string) {
  const { erro, reportarErro, limparErro } = useErroToast();
  const [dado, setDado] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscar(id)
      .then(setDado)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { dado, carregando, erro, reportarErro, limparErro };
}
