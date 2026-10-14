import { useCallback, useState } from 'react';
import { BadgeSituacaoRevisao } from '../../components/crud/badge-situacao-revisao';
import { GenericTable } from '../../components/crud/generic-table';
import { pagamentoRevisaoApi } from '../../services/32-pagamento-revisao/api/pagamento-revisao.api';
import {
  ORDEM_SITUACAO_REVISAO,
  ROTULO_SITUACAO_REVISAO,
  rotuloTipoEvento,
} from '../../services/32-pagamento-revisao/constants/pagamento-revisao.constants';
import { ModalResolverRevisao } from './modal-resolver-revisao';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { RevisaoPagamentoResponse } from '../../services/32-pagamento-revisao/type/pagamento-revisao.type';

interface RevisaoLinha extends RevisaoPagamentoResponse {
  tipo: string;
  situacaoRotulo: string;
  motivoTexto: string;
  contribuicao: string;
  repasse: string;
}

// Eventos de Pagamento (moderação financeira): os webhooks do provedor que não terminaram com sucesso. "Em revisão
// manual" é o caso sério: o provedor diz que o dinheiro se moveu e o sistema NÃO aplicou de propósito (ex.: pagamento
// de uma contribuição que já expirou), então alguém precisa decidir. "Falhou, vale tentar de novo" foi um erro
// transitório. Alterar abre a baixa (só nos em revisão manual); Consultar abre qualquer evento só para ler.
export function ListarRevisoesPagamento({ auth }: PropsPagina) {
  const [aberto, setAberto] = useState<{ revisao: RevisaoPagamentoResponse; somenteLeitura: boolean } | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listar = useCallback(async (): Promise<RevisaoLinha[]> => {
    const revisoes = await pagamentoRevisaoApi.listarRevisoes(auth.authFetch);
    return revisoes.map((revisao) => ({
      ...revisao,
      tipo: rotuloTipoEvento(revisao.tipoEvento),
      situacaoRotulo: ROTULO_SITUACAO_REVISAO[revisao.situacao],
      motivoTexto: revisao.motivo ?? '-',
      contribuicao: revisao.idContribuicao === null ? '-' : `#${revisao.idContribuicao}`,
      repasse: revisao.idRepasse === null ? '-' : `#${revisao.idRepasse}`,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Eventos de Pagamento"
        ajuda="Avisos do provedor de pagamento que não terminaram com sucesso. Em revisão manual: o provedor diz que o dinheiro se moveu e o sistema não aplicou de propósito, então uma pessoa precisa decidir. Falhou, vale tentar de novo: erro passageiro, em geral resolvido quando o provedor reenvia o aviso."
        colunas={[
          { chave: 'idEvento', rotulo: 'id', tipo: 'id' },
          { chave: 'motivoTexto', rotulo: 'motivo', tipo: 'nome', umaLinha: true },
          { chave: 'tipo', rotulo: 'evento', tipo: 'texto' },
          { chave: 'provedor', rotulo: 'provedor', tipo: 'status' },
          { chave: 'contribuicao', rotulo: 'contribuição', tipo: 'codigo' },
          { chave: 'repasse', rotulo: 'repasse', tipo: 'codigo' },
          { chave: 'recebidoEm', rotulo: 'esperando', tipo: 'espera' },
          {
            chave: 'situacaoRotulo',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: RevisaoLinha) => <BadgeSituacaoRevisao situacao={linha.situacao} />,
          },
        ]}
        vazio={{
          icone: 'fa-circle-check',
          titulo: 'Nenhum evento de pagamento pede revisão.',
          texto: 'Quando um aviso do provedor não puder ser aplicado sozinho, ele aparece aqui para uma pessoa decidir.',
        }}
        chavePrimaria="idEvento"
        listar={listar}
        acoes={{
          alterar: (linha) => setAberto({ revisao: linha, somenteLeitura: false }),
          consultar: (linha) => setAberto({ revisao: linha, somenteLeitura: true }),
        }}
        acaoIndisponivel={(linha, acao) =>
          acao === 'alterar' && linha.situacao !== 'em_revisao_manual'
            ? 'Só um evento em revisão manual pode ser resolvido. Este falhou por um motivo passageiro.'
            : undefined
        }
        filtrosFacetados={[
          { chave: 'situacaoRotulo', rotulo: 'Situação', ordem: ORDEM_SITUACAO_REVISAO.map((situacao) => ROTULO_SITUACAO_REVISAO[situacao]) },
          { chave: 'tipo', rotulo: 'Evento' },
        ]}
      />

      {aberto && (
        <ModalResolverRevisao
          authFetch={auth.authFetch}
          revisao={aberto.revisao}
          somenteLeitura={aberto.somenteLeitura}
          aoFechar={() => setAberto(null)}
          aoResolvido={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}
    </div>
  );
}
