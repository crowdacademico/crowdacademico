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

// `semId`: no Alterar do dono (Estúdio, área pública) o id não aparece; só a gestão vê.
export function TabelaSolicitacoesEncerramento({ solicitacoes, semId = false }: { solicitacoes: SolicitacaoEncerramentoResponse[]; semId?: boolean }) {
  return (
    <CaixaTabela rotulo="Pedidos de encerramento da campanha">
      <table className="crud-tabela">
        <thead>
          <tr>
            {!semId && <th className="crud-tabela__col--id">id</th>}
            <th className="crud-tabela__col--curta">Data</th>
            <th>Justificativa</th>
            <th className="crud-tabela__col--curta">Situação</th>
            <th className="crud-tabela__col--texto">Decidido por</th>
            <th>Decisão</th>
          </tr>
        </thead>
        <tbody>
          {solicitacoes.map((item) => (
            <tr key={item.idSolicitacao}>
              {!semId && <td data-rotulo="id" className="crud-tabela__col--id">{item.idSolicitacao}</td>}
              <td data-rotulo="Data" className="crud-tabela__col--curta">{formatarData(item.solicitadoEm)}</td>
              <td data-rotulo="Justificativa">
                <TextoResumido texto={item.justificativaPesquisador} />
              </td>
              <td data-rotulo="Situação">
                <BadgeStatusEncerramento status={item.status} />
              </td>
              <td data-rotulo="Decidido por" className="crud-tabela__col--texto">{quemDecidiu(item)}</td>
              <td data-rotulo="Decisão">
                <TextoResumido texto={item.justificativaAdmin} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CaixaTabela>
  );
}
