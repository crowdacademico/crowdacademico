// Pedidos de encerramento antecipado de uma campanha, só para ler: quando, o porquê do pesquisador, a situação e a
// decisão (quem decidiu e por quê). Usada no Consultar da campanha e no Alterar do dono.

import { BadgeStatusEncerramento } from '../badge-status-encerramento';
import { TextoResumido } from '../texto-resumido';
import { formatarData } from '../../../services/constant/util/formatacao.util';
import type { SolicitacaoEncerramentoResponse } from '../../../services/20-solicitacao-encerramento/type/solicitacao-encerramento.type';
import { CaixaTabela } from './caixa-tabela';

// Quem decidiu: o admin, ou o próprio pesquisador quando encerrou direto (pedido aprovado sem admin).
function quemDecidiu(item: SolicitacaoEncerramentoResponse): string {
  if (item.status === 'aprovado' && item.idAdmin === null) return 'O próprio pesquisador (sem contribuição)';
  if (item.idAdmin === null) return '-';
  return item.nomeAdmin ?? `#${item.idAdmin}`;
}

export function TabelaSolicitacoesEncerramento({ solicitacoes }: { solicitacoes: SolicitacaoEncerramentoResponse[] }) {
  return (
    <CaixaTabela rotulo="Pedidos de encerramento da campanha">
      <table className="crud-tabela">
        <thead>
          <tr>
            <th className="crud-tabela__col--id">id</th>
            <th>Data</th>
            <th>Justificativa</th>
            <th>Situação</th>
            <th>Decidido por</th>
            <th>Decisão</th>
          </tr>
        </thead>
        <tbody>
          {solicitacoes.map((item) => (
            <tr key={item.idSolicitacao}>
              <td className="crud-tabela__col--id">{item.idSolicitacao}</td>
              <td>{formatarData(item.solicitadoEm)}</td>
              <td>
                <TextoResumido texto={item.justificativaPesquisador} titulo={`Justificativa do pedido #${item.idSolicitacao}`} />
              </td>
              <td>
                <BadgeStatusEncerramento status={item.status} />
              </td>
              <td>{quemDecidiu(item)}</td>
              <td>
                <TextoResumido texto={item.justificativaAdmin} titulo={`Decisão do pedido #${item.idSolicitacao}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CaixaTabela>
  );
}
