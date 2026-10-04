import { useEffect, useState } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { TabelaSolicitacoesEncerramento } from '../../components/crud/tabelas/13-tabela-solicitacoes-encerramento';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { solicitacaoEncerramentoApi } from '../../services/20-solicitacao-encerramento/api/solicitacao-encerramento.api';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { SolicitacaoEncerramentoResponse } from '../../services/20-solicitacao-encerramento/type/solicitacao-encerramento.type';

// Pedidos de encerramento de uma campanha no Consultar (só para ler; decidir fica na tela Encerramentos). Só aparece
// quando há algum: são poucos por campanha. `aoContar`: o Consultar usa o total para mostrar a parte Moderação.
export function SecaoPedidosEncerramento({
  authFetch,
  idCampanha,
  aoContar,
}: {
  authFetch: AuthFetch;
  idCampanha: number;
  aoContar?: (total: number) => void;
}) {
  const [pedidos, setPedidos] = useState<SolicitacaoEncerramentoResponse[]>([]);
  const { reportarErro } = useErroToast();

  useEffect(() => {
    solicitacaoEncerramentoApi
      .listar(authFetch, { idCampanha })
      .then((lista) => {
        setPedidos(lista);
        aoContar?.(lista.length);
      })
      .catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, idCampanha]);

  if (pedidos.length === 0) {
    return null;
  }
  return (
    <SecaoFicha titulo={`Pedidos de encerramento (${pedidos.length})`} colunas={1}>
      <TabelaSolicitacoesEncerramento solicitacoes={pedidos} />
    </SecaoFicha>
  );
}
