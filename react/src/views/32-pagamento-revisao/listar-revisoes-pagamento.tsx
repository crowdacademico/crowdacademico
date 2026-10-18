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
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { RevisaoPagamentoResponse } from '../../services/32-pagamento-revisao/type/pagamento-revisao.type';

interface RevisaoLinha extends RevisaoPagamentoResponse {
  tipo: string;
  situacaoRotulo: string;
  motivoTexto: string;
  // A data em que o aviso chegou, numa coluna própria; `recebidoEm` alimenta o "esperando" (quanto tempo faz).
  recebidoEmData: string;
}

// Eventos de Pagamento (moderação financeira): os webhooks do provedor que não terminaram com sucesso. "Em revisão
// manual" é o caso sério: o provedor diz que o dinheiro se moveu e o sistema NÃO aplicou de propósito (ex.: pagamento
// de uma contribuição que já expirou), então alguém precisa decidir. "Falhou, vale tentar de novo" foi um erro
// transitório. Alterar abre a baixa (só nos em revisão manual); Consultar abre qualquer evento só para ler.
// Sinal e cor só quando o dinheiro de fato andou e o evento está em revisão manual; numa falha, valor neutro.
const sentidoVisivel = (linha: RevisaoLinha) => (linha.situacao === 'em_revisao_manual' ? linha.sentido : null);
const SINAL = { entrada: '+', saida: '-' } as const;
const CLASSE_SENTIDO = { entrada: 'texto-sucesso enfase', saida: 'texto-erro enfase' } as const;
const textoValor = (linha: RevisaoLinha) => {
  if (linha.valor === null) return '-';
  const sentido = sentidoVisivel(linha);
  return (sentido ? SINAL[sentido] + ' ' : '') + formatarMoeda(linha.valor);
};
// Arrecadado atual da campanha do evento; "-" quando o evento não está ligado a nenhuma campanha.
const textoArrecadado = (linha: RevisaoLinha) => (linha.arrecadado === null ? '-' : formatarMoeda(linha.arrecadado));
const renderizarValor = (linha: RevisaoLinha) => {
  const sentido = sentidoVisivel(linha);
  return sentido ? <span className={CLASSE_SENTIDO[sentido]}>{textoValor(linha)}</span> : textoValor(linha);
};

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
      recebidoEmData: revisao.recebidoEm,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Eventos de Pagamento"
        ajuda="Avisos do provedor de pagamento que não terminaram com sucesso. Em revisão manual: o provedor diz que o dinheiro se moveu e o sistema não aplicou de propósito, então uma pessoa precisa decidir. Falhou, vale tentar de novo: erro passageiro; o sistema tenta de novo sozinho e, se o aviso continuar sem dono depois do prazo do parâmetro webhook_reprocessar_horas, ele passa para revisão manual."
        colunas={[
          { chave: 'idEvento', rotulo: 'id', tipo: 'id' },
          { chave: 'motivoTexto', rotulo: 'motivo', tipo: 'nome', umaLinha: true },
          { chave: 'tipo', rotulo: 'evento', tipo: 'texto' },
          { chave: 'recebidoEmData', rotulo: 'recebido em', tipo: 'dataHora' },
          // O dinheiro do evento: verde com "+" quando entrou, vermelho com "-" quando saiu (estorno, devolução, repasse),
          // cor normal sem sinal quando nada se moveu ou quando o evento só falhou (vale tentar de novo).
          { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro', renderizar: renderizarValor, textoExibido: textoValor },
          { chave: 'arrecadado', rotulo: 'arrecadado', tipo: 'dinheiro', renderizar: textoArrecadado, textoExibido: textoArrecadado },
          { chave: 'recebidoEm', rotulo: 'esperando', tipo: 'espera' },
          {
            chave: 'situacaoRotulo',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: RevisaoLinha) => <BadgeSituacaoRevisao situacao={linha.situacao} />,
            textoExibido: (linha: RevisaoLinha) => ROTULO_SITUACAO_REVISAO[linha.situacao],
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
