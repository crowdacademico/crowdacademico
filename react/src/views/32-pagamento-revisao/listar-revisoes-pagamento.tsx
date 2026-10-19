import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BadgeSituacaoRevisao } from '../../components/crud/badge-situacao-revisao';
import { GenericTable } from '../../components/crud/generic-table';
import { pagamentoRevisaoApi } from '../../services/32-pagamento-revisao/api/pagamento-revisao.api';
import {
  ORDEM_SITUACAO_REVISAO,
  ROTULO_SITUACAO_REVISAO,
  SITUACOES_PENDENTES,
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
  // A data em que o aviso chegou, numa coluna própria.
  recebidoEmData: string;
  // "Esperando" só faz sentido no que ainda pede algo (em revisão ou para tentar de novo); no resto, vazio.
  esperandoDesde: string | null;
}

// Eventos de Pagamento: TODOS os avisos do provedor (cada pagamento, estorno, devolução e transferência), do mais
// novo para o mais antigo. A tela abre filtrada no que ainda pede algo: "Em revisão manual" é o caso sério (o provedor
// diz que o dinheiro se moveu e o sistema NÃO aplicou de propósito, ex.: pagamento de uma contribuição que já
// expirou), e "Tentar de novo" foi um erro passageiro. Desmarcando o filtro, aparece o histórico inteiro. Alterar abre
// a baixa (só nos em revisão manual); Consultar abre qualquer evento só para ler.
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

  // Abre filtrada no que ainda pede algo; o histórico inteiro fica a um clique (desmarcar o filtro).
  const [parametros, setParametros] = useSearchParams();
  useEffect(() => {
    if (!parametros.has('situacaoRotulo')) {
      setParametros({ situacaoRotulo: SITUACOES_PENDENTES.map((s) => ROTULO_SITUACAO_REVISAO[s]).join(',') }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listar = useCallback(async (): Promise<RevisaoLinha[]> => {
    const revisoes = await pagamentoRevisaoApi.listarRevisoes(auth.authFetch);
    return revisoes.map((revisao) => ({
      ...revisao,
      tipo: rotuloTipoEvento(revisao.tipoEvento),
      situacaoRotulo: ROTULO_SITUACAO_REVISAO[revisao.situacao],
      motivoTexto: revisao.motivo ?? '-',
      recebidoEmData: revisao.recebidoEm,
      esperandoDesde: SITUACOES_PENDENTES.includes(revisao.situacao) ? revisao.recebidoEm : null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Eventos de Pagamento"
        ajuda="Todos os avisos do provedor de pagamento, do mais novo para o mais antigo. Processado: o sistema aplicou o aviso. Em revisão manual: o provedor diz que o dinheiro se moveu e o sistema não aplicou de propósito, então uma pessoa precisa decidir. Tentar de novo: erro passageiro; o sistema tenta de novo sozinho e, se o aviso continuar sem dono depois do prazo do parâmetro webhook_reprocessar_horas, ele passa para revisão manual. Revisão resolvida: uma pessoa já deu baixa. A tela abre filtrada no que ainda pede algo."
        colunas={[
          { chave: 'idEvento', rotulo: 'id', tipo: 'id' },
          { chave: 'motivoTexto', rotulo: 'motivo', tipo: 'nome', umaLinha: true },
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
          acao === 'alterar' && linha.situacao !== 'em_revisao_manual'
            ? 'Só um evento em revisão manual pode ser resolvido.'
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
