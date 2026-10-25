import { useCallback, useState } from 'react';
import { BadgeSituacaoRevisao } from '../../components/crud/badge-situacao-revisao';
import { GenericTable } from '../../components/crud/generic-table';
import { pagamentoRevisaoApi } from '../../services/25-pagamento-revisao/api/pagamento-revisao.api';
import {
  ORDEM_SITUACAO_REVISAO,
  ROTULO_SITUACAO_REVISAO,
  SITUACOES_PENDENTES,
} from '../../services/25-pagamento-revisao/constants/pagamento-revisao.constants';
import { ModalResolverRevisao } from './modal-resolver-revisao';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { RevisaoPagamentoResponse } from '../../services/25-pagamento-revisao/type/pagamento-revisao.type';
import { ordenarFilaSla } from '../../services/constant/util/fila-sla.util';

interface RevisaoLinha extends RevisaoPagamentoResponse {
  tipo: string;
  situacaoRotulo: string;
  motivoTexto: string;
  // A data em que o aviso chegou, numa coluna própria.
  recebidoEmData: string;
  // "Esperando" só faz sentido no que ainda pede algo (em revisão ou para tentar de novo); no resto, vazio.
  esperandoDesde: string | null;
}

// Eventos de Pagamento: TODOS os avisos do provedor (cada pagamento, estorno, devolução e transferência). Fila do SLA
// (DS-49): primeiro o que ainda pede algo, o mais antigo no topo: "Em revisão manual" é o caso sério (o provedor diz que o
// dinheiro se moveu e o sistema NÃO aplicou de propósito, ex.: pagamento de uma contribuição que já expirou), e "Tentar de
// novo" foi um erro passageiro. Depois, o histórico, do mais novo para o mais antigo. Abre sem filtro. Alterar abre
// a baixa (nos que ainda não foram processados); Consultar abre qualquer evento só para ler.
// O sinal diz para onde o dinheiro andou na conta da plataforma: "+" entrou (verde), "-" saiu (estorno, devolução,
// repasse; cor normal: sair dinheiro é o sistema funcionando, não um erro). Sem sinal quando nada se moveu.
const SINAL = { entrada: '+', saida: '-' } as const;
const CLASSE_SENTIDO = { entrada: 'texto-sucesso enfase', saida: 'enfase' } as const;
const textoValor = (linha: RevisaoLinha) => {
  if (linha.valor === null) return '-';
  return (linha.sentido ? SINAL[linha.sentido] + ' ' : '') + formatarMoeda(linha.valor);
};
// Arrecadado atual da campanha do evento; "-" quando o evento não está ligado a nenhuma campanha.
const textoArrecadado = (linha: RevisaoLinha) => (linha.arrecadado === null ? '-' : formatarMoeda(linha.arrecadado));
const renderizarValor = (linha: RevisaoLinha) =>
  linha.sentido ? <span className={CLASSE_SENTIDO[linha.sentido]}>{textoValor(linha)}</span> : textoValor(linha);

export function ListarRevisoesPagamento({ auth }: PropsPagina) {
  const [aberto, setAberto] = useState<{ revisao: RevisaoPagamentoResponse; somenteLeitura: boolean } | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listar = useCallback(async (): Promise<RevisaoLinha[]> => {
    const revisoes = await pagamentoRevisaoApi.listarRevisoes(auth.authFetch);
    const esperandoDesde = (revisao: RevisaoPagamentoResponse) => (SITUACOES_PENDENTES.includes(revisao.situacao) ? revisao.recebidoEm : null);
    return ordenarFilaSla(revisoes, esperandoDesde, (revisao) => revisao.recebidoEm).map((revisao) => ({
      ...revisao,
      tipo: revisao.tipoEvento,
      situacaoRotulo: ROTULO_SITUACAO_REVISAO[revisao.situacao],
      motivoTexto: revisao.motivo ?? '-',
      recebidoEmData: revisao.recebidoEm,
      esperandoDesde: esperandoDesde(revisao),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Eventos de Pagamento"
        ajuda="Todos os avisos do provedor de pagamento, do mais novo para o mais antigo. Processado: o sistema aplicou o aviso. Em revisão manual: o provedor diz que o dinheiro se moveu e o sistema não aplicou de propósito, então uma pessoa precisa decidir. Tentar de novo: erro passageiro; o sistema tenta de novo sozinho e, se o aviso continuar sem dono depois do prazo do parâmetro webhook_reprocessar_horas, ele passa para revisão manual. Revisão resolvida: uma pessoa já deu baixa. O que ainda pede algo vem primeiro, o mais antigo no topo."
        colunas={[
          { chave: 'idEvento', rotulo: 'id', tipo: 'id' },
          { chave: 'motivoTexto', rotulo: 'erro de processamento', tipo: 'nome', umaLinha: true },
          { chave: 'tipo', rotulo: 'evento', tipo: 'texto' },
          { chave: 'recebidoEmData', rotulo: 'recebido em', tipo: 'dataHora' },
          { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro', renderizar: renderizarValor, textoExibido: textoValor },
          { chave: 'arrecadado', rotulo: 'arrecadado', tipo: 'dinheiro', renderizar: textoArrecadado, textoExibido: textoArrecadado },
          { chave: 'esperandoDesde', rotulo: 'esperando', tipo: 'espera' },
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
          titulo: 'Nenhum evento de pagamento nesta situação.',
          texto: 'Desmarque o filtro de situação para ver o histórico inteiro dos avisos do provedor.',
        }}
        chavePrimaria="idEvento"
        listar={listar}
        acoes={{
          alterar: (linha) => setAberto({ revisao: linha, somenteLeitura: false }),
          consultar: (linha) => setAberto({ revisao: linha, somenteLeitura: true }),
        }}
        acaoIndisponivel={(linha, acao) =>
          acao === 'alterar' && !SITUACOES_PENDENTES.includes(linha.situacao)
            ? 'Este evento já foi processado.'
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
