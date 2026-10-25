import { useCallback } from 'react';
import { BadgeStatusRepasse } from '../../components/crud/badge-status-repasse';
import { GenericTable } from '../../components/crud/generic-table';
import { ROTULO_AGUARDANDO_CONTA, ROTULO_STATUS_REPASSE, rotuloSituacaoRepasse } from '../../services/23-pagamento/constants/status-repasse.constants';
import { pagamentoRevisaoApi } from '../../services/25-pagamento-revisao/api/pagamento-revisao.api';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { RepasseAdminResponse } from '../../services/25-pagamento-revisao/type/pagamento-revisao.type';

interface RepasseLinha extends RepasseAdminResponse {
  situacao: string;
}

// "Aguardando chave Pix" logo depois de "Pendente": é um pendente que espera o pesquisador.
const ORDEM_SITUACAO = Object.values(ROTULO_STATUS_REPASSE).flatMap((rotulo) =>
  rotulo === ROTULO_STATUS_REPASSE.pendente ? [rotulo, ROTULO_AGUARDANDO_CONTA] : [rotulo],
);

// Repasses: todos os pagamentos do arrecadado ao pesquisador, o mais novo primeiro. Só leitura: o que pede ação (erro,
// esperando a chave Pix) também aparece em Repasses em Atenção, que é onde se age. A campanha é a coluna nome (DS-45).
export function ListarRepasses({ auth }: PropsPagina) {
  const listar = useCallback(
    async (): Promise<RepasseLinha[]> =>
      (await pagamentoRevisaoApi.listarRepasses(auth.authFetch)).map((repasse) => ({
        ...repasse,
        situacao: rotuloSituacaoRepasse(repasse.status, repasse.aguardandoConta),
      })),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Repasses"
        ajuda="Todos os repasses, o mais novo primeiro: o pagamento do que uma campanha arrecadou ao pesquisador, quando ela termina. Bruto: o arrecadado; líquido: o que vai para o pesquisador, já sem a taxa da plataforma. Meta: se a campanha bateu a meta. Os que pedem ação (erro ou esperando a chave Pix) se resolvem em Repasses em Atenção. Só leitura."
        colunas={[
          { chave: 'idRepasse', rotulo: 'id', tipo: 'id' },
          { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'valorBruto', rotulo: 'bruto', tipo: 'dinheiro' },
          { chave: 'valorLiquido', rotulo: 'líquido', tipo: 'dinheiro' },
          { chave: 'metaAtingida', rotulo: 'meta', tipo: 'simNao' },
          {
            chave: 'situacao',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: RepasseLinha) => <BadgeStatusRepasse status={linha.status} aguardandoConta={linha.aguardandoConta} />,
            textoExibido: (linha: RepasseLinha) => linha.situacao,
          },
          { chave: 'criadoEm', rotulo: 'criado', tipo: 'dataHora' },
          { chave: 'repassadoEm', rotulo: 'repassado', tipo: 'dataHora' },
        ]}
        vazio={{
          icone: 'fa-money-check-dollar',
          titulo: 'Nenhum repasse ainda.',
          texto: 'Quando uma campanha termina com dinheiro a receber, o repasse ao pesquisador aparece aqui.',
        }}
        chavePrimaria="idRepasse"
        listar={listar}
        filtrosFacetados={[{ chave: 'situacao', rotulo: 'Situação', ordem: ORDEM_SITUACAO }]}
      />
    </div>
  );
}
