import { useCallback } from 'react';
import { BadgeStatusContribuicao } from '../../components/crud/badge-status-contribuicao';
import { BadgeStatusRepasse } from '../../components/crud/badge-status-repasse';
import { GenericTable } from '../../components/crud/generic-table';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import { ROTULO_STATUS_CONTRIBUICAO } from '../../services/22-contribuicao/constants/status-contribuicao.constants';
import { ROTULO_STATUS_REPASSE } from '../../services/23-pagamento/constants/status-repasse.constants';
import { pagamentoRevisaoApi } from '../../services/25-pagamento-revisao/api/pagamento-revisao.api';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { ContribuicaoAdminResponse } from '../../services/25-pagamento-revisao/type/pagamento-revisao.type';

interface ContribuicaoLinha extends ContribuicaoAdminResponse {
  apoiador: string;
  meio: string;
  situacao: string;
  repasse: string;
}

const SEM_CONTA = 'Sem conta';
const SEM_REPASSE = '-';

function paraLinha(contribuicao: ContribuicaoAdminResponse): ContribuicaoLinha {
  const nome = contribuicao.nomeApoiador ?? SEM_CONTA;
  return {
    ...contribuicao,
    apoiador: contribuicao.anonima ? `${nome} (anônima)` : nome,
    meio: ROTULO_MEIO_PAGAMENTO[contribuicao.meioPagamento],
    situacao: ROTULO_STATUS_CONTRIBUICAO[contribuicao.status],
    repasse: contribuicao.statusRepasse === null ? SEM_REPASSE : ROTULO_STATUS_REPASSE[contribuicao.statusRepasse],
  };
}

// Contribuições: todas as contribuições do sistema, a mais nova primeiro, com a situação do repasse em que cada uma
// entrou. Só leitura: devolver e repassar são das filas (Reembolsos Manuais, Repasses em Atenção). A campanha é a
// coluna nome (DS-45); "quando" fica por último, como na Auditoria Financeira.
export function ListarContribuicoes({ auth }: PropsPagina) {
  const listar = useCallback(
    async (): Promise<ContribuicaoLinha[]> => (await pagamentoRevisaoApi.listarContribuicoes(auth.authFetch)).map(paraLinha),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Contribuições"
        ajuda="Todas as contribuições, a mais nova primeiro: quem apoiou qual campanha, o valor, o meio de pagamento e a situação. Repasse: a situação do pagamento ao pesquisador em que a contribuição entrou (só contribuição paga de campanha encerrada entra). Anônima: o nome não aparece para o público. Só leitura."
        colunas={[
          { chave: 'idContribuicao', rotulo: 'id', tipo: 'id' },
          { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'apoiador', rotulo: 'apoiador', tipo: 'texto', umaLinha: true },
          { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro' },
          { chave: 'meio', rotulo: 'meio', tipo: 'status' },
          {
            chave: 'situacao',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: ContribuicaoLinha) => <BadgeStatusContribuicao status={linha.status} />,
            textoExibido: (linha: ContribuicaoLinha) => linha.situacao,
          },
          {
            chave: 'repasse',
            rotulo: 'repasse',
            tipo: 'status',
            renderizar: (linha: ContribuicaoLinha) =>
              linha.statusRepasse === null ? SEM_REPASSE : <BadgeStatusRepasse status={linha.statusRepasse} />,
            textoExibido: (linha: ContribuicaoLinha) => linha.repasse,
          },
          { chave: 'criadoEm', rotulo: 'quando', tipo: 'dataHora' },
        ]}
        vazio={{
          icone: 'fa-hand-holding-heart',
          titulo: 'Nenhuma contribuição ainda.',
          texto: 'Cada apoio a uma campanha aparece aqui, do Pix gerado até o repasse ao pesquisador.',
        }}
        chavePrimaria="idContribuicao"
        listar={listar}
        filtrosFacetados={[
          { chave: 'situacao', rotulo: 'Situação', ordem: Object.values(ROTULO_STATUS_CONTRIBUICAO) },
          { chave: 'meio', rotulo: 'Meio', ordem: Object.values(ROTULO_MEIO_PAGAMENTO) },
          { chave: 'repasse', rotulo: 'Repasse', ordem: [...Object.values(ROTULO_STATUS_REPASSE), SEM_REPASSE] },
        ]}
      />
    </div>
  );
}
