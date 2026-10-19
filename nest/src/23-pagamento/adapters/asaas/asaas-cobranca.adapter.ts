import { GatewayPagamentoErro } from '../../ports/erro-gateway-pagamento';
import {
  type MeioPagamentoGateway,
  type ResultadoCobranca,
  type ResultadoEstorno,
  type StatusCobrancaGateway,
} from '../../dto/resultado-cobranca.dto';
import {
  type CobrancaGatewayPort,
  type CriarCobrancaParams,
} from '../../ports/cobranca-gateway.port';
import { AsaasHttpClient } from './asaas-http.client';
import { type ConfiguracaoAsaas } from './asaas.config';
import {
  dadosBoletoAsaas,
  pedirDevolucaoBoletoAsaas,
} from './asaas-cobranca-boleto';
import { linkPagamentoCartaoAsaas } from './asaas-cobranca-cartao';
import { dadosPixAsaas } from './asaas-cobranca-pix';
import {
  type AsaasLista,
  type AsaasPayment,
  type AsaasRefund,
} from './asaas.types';

export const NOME_PROVEDOR = 'asaas';

// Data (AAAA-MM-DD) no fuso de Brasília: o Asaas só tem vencimento por DATA e conta o dia no horário do Brasil.
export function dataBrasilia(quando: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(quando);
}

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;
// Arredonda para cima no centavo, sem o erro de ponto flutuante (100.00 * 100 = 10000.000000001 viraria 100.01).
const centavosParaCima = (valor: number): number =>
  Math.ceil(Number((valor * 100).toFixed(6))) / 100;
const MAXIMO_RODADAS_AJUSTE = 3;

// Estado do Asaas => estado de domínio.
//   PENDING / AWAITING_RISK_ANALYSIS / desconhecido => pendente
//   CONFIRMED / RECEIVED / RECEIVED_IN_CASH / REFUND_REQUESTED / REFUND_IN_PROGRESS / CHARGEBACK_* => confirmada
//       (o dinheiro entrou; um estorno em andamento ainda não o devolveu: o que foi devolvido está em `refunds`)
//   OVERDUE / cobrança removida (DELETED) => expirada
//   REFUNDED => estornada
export function statusDeDominio(
  pagamento: AsaasPayment,
): StatusCobrancaGateway {
  if (pagamento.deleted) return 'expirada';
  switch (pagamento.status) {
    case 'CONFIRMED':
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
    case 'REFUND_REQUESTED':
    case 'REFUND_IN_PROGRESS':
      return 'confirmada';
    case 'REFUNDED':
      return 'estornada';
    case 'OVERDUE':
      return 'expirada';
    default:
      if (pagamento.status.startsWith('CHARGEBACK')) return 'confirmada';
      return 'pendente';
  }
}

// RECEIVED = o Asaas creditou o dinheiro na conta (Pix: na hora; cartão: cerca de 30 dias depois). CONFIRMED (cartão
// aprovado, ainda não creditado) é 'confirmada' mas NÃO liberado.
const STATUS_DINHEIRO_LIBERADO = ['RECEIVED', 'RECEIVED_IN_CASH'];
const TIPO_COBRANCA_ASAAS: Record<MeioPagamentoGateway, string> = {
  pix: 'PIX',
  cartao_credito: 'CREDIT_CARD',
  boleto: 'BOLETO',
};
const MEIO_DO_TIPO_ASAAS: Record<string, MeioPagamentoGateway> = {
  PIX: 'pix',
  CREDIT_CARD: 'cartao_credito',
  BOLETO: 'boleto',
};
// Devolução que não aconteceu nem vai acontecer: pode-se pedir outra. Qualquer outro estado (DONE, PENDING, aguardando
// autorização...) é a MESMA devolução, ainda viva: pedir de novo devolveria duas vezes.
const STATUS_ESTORNO_SEM_EFEITO = ['CANCELLED', 'FAILED', 'REFUSED'];

// Soma só os estornos CONCLUÍDOS (status DONE): a existência do array `refunds` não significa que o dinheiro voltou.
export function totalEstornado(pagamento: AsaasPayment): number {
  return arredondar(
    (pagamento.refunds ?? [])
      .filter((r) => r.status === 'DONE')
      .reduce((soma, r) => soma + (r.value ?? 0), 0),
  );
}

function marcador(chaveIdempotencia: string): string {
  return `ref:${chaveIdempotencia}`;
}

// Cobrança no Asaas (Pix, cartão de crédito ou boleto). O que é comum mora aqui; o que é de cada meio, em
// asaas-cobranca-pix.ts, asaas-cobranca-cartao.ts e asaas-cobranca-boleto.ts. Fluxo de criarCobranca:
//   1. IDEMPOTÊNCIA: o Asaas NÃO tem chave de idempotência. A chave do sistema vai em `externalReference` e, antes de criar,
//      procura-se uma cobrança com essa referência (GET /payments?externalReference=...). Existindo, reaproveita (é o que
//      acontece num retry depois de um timeout). Sem isso, um retry criaria cobrança duplicada.
//   2. cria a cobrança (POST /payments) para o cliente genérico ASAAS_CUSTOMER_ID, na forma pedida (PIX, CREDIT_CARD ou BOLETO);
//   3. TARIFA REAL: o Asaas já informa na criação quanto vai cair na conta (`netValue`). Se não cobrir a contribuição
//      certinho, o valor da cobrança é corrigido ANTES de a pessoa ver o Pix ou a página do cartão: quem apoia paga a
//      tarifa de verdade, nem a mais nem a menos (ajustarAoLiquido);
//   4. o que é do meio: QR do Pix, link da página segura do cartão, ou o boleto com a linha digitável.
// Se algo falhar depois de a cobrança existir, ela é CANCELADA antes de devolver o erro: sem isso ficaria aberta e pagável
// sem nenhuma contribuição ligada a ela. `split` não é usado: se vier, recusa (nunca ignora dinheiro que seria dividido).
export class AsaasCobrancaAdapter implements CobrancaGatewayPort {
  readonly provedor = NOME_PROVEDOR;

  constructor(
    private readonly http: AsaasHttpClient,
    private readonly config: ConfiguracaoAsaas,
  ) {}

  async criarCobranca(params: CriarCobrancaParams): Promise<ResultadoCobranca> {
    if (params.split) {
      throw new GatewayPagamentoErro(
        'RECUSADO',
        'Divisão de pagamento (split) não é suportada por este adapter.',
        false,
        400,
      );
    }
    const valor = arredondar(params.valor);
    if (!(valor > 0)) {
      throw new GatewayPagamentoErro(
        'RECUSADO',
        'Valor da cobrança inválido.',
        false,
        400,
      );
    }

    let pagamento = await this.buscarPorReferencia(params.chaveIdempotencia);
    pagamento ??= await this.http.requisitar<AsaasPayment>(
      'POST',
      '/payments',
      {
        corpo: {
          customer: this.config.customerId,
          billingType: TIPO_COBRANCA_ASAAS[params.meioPagamento],
          value: valor,
          dueDate: dataBrasilia(params.expiraEm),
          description: params.descricao?.slice(0, 500),
          externalReference: params.chaveIdempotencia,
        },
      },
    );

    try {
      if (params.tarifaEstimada !== undefined) {
        pagamento = await this.ajustarAoLiquido(
          pagamento,
          arredondar(valor - params.tarifaEstimada),
          params.expiraEm,
        );
      }
      const resultado = this.paraResultado(pagamento);
      switch (params.meioPagamento) {
        case 'pix':
          return {
            ...resultado,
            pix: await dadosPixAsaas(this.http, pagamento.id, params.expiraEm),
          };
        case 'boleto':
          return {
            ...resultado,
            boleto: await dadosBoletoAsaas(
              this.http,
              pagamento,
              params.expiraEm,
            ),
          };
        default:
          return {
            ...resultado,
            linkPagamento: linkPagamentoCartaoAsaas(pagamento),
          };
      }
    } catch (erro) {
      await this.cancelarCobranca(pagamento.id).catch(() => undefined);
      throw erro;
    }
  }

  // Corrige o valor da cobrança até o líquido (`netValue`) cobrir a contribuição, sobrando no máximo 1 centavo. No Pix
  // a tarifa é fixa e basta uma correção; no cartão ela é percentual, e a correção de um valor também paga tarifa: duas
  // ou três rodadas chegam. Se mesmo assim o líquido não cobrir, recusa (a plataforma nunca paga a tarifa).
  private async ajustarAoLiquido(
    pagamento: AsaasPayment,
    liquidoDesejado: number,
    expiraEm: Date,
  ): Promise<AsaasPayment> {
    let atual = pagamento;
    for (let rodada = 0; rodada <= MAXIMO_RODADAS_AJUSTE; rodada++) {
      if (atual.netValue === undefined) return atual;
      const falta = arredondar(liquidoDesejado - atual.netValue);
      if (falta <= 0 && falta > -0.02) return atual;
      if (rodada === MAXIMO_RODADAS_AJUSTE) break;
      atual = await this.http.requisitar<AsaasPayment>(
        'PUT',
        `/payments/${encodeURIComponent(atual.id)}`,
        {
          corpo: {
            value: centavosParaCima(atual.value + falta),
            dueDate: dataBrasilia(expiraEm),
          },
        },
      );
    }
    if (atual.netValue !== undefined && atual.netValue < liquidoDesejado) {
      throw new GatewayPagamentoErro(
        'RECUSADO',
        'Não foi possível ajustar a cobrança à tarifa do provedor.',
        false,
        400,
      );
    }
    return atual;
  }

  async consultarCobranca(idCobranca: string): Promise<ResultadoCobranca> {
    return this.paraResultado(await this.obter(idCobranca));
  }

  // Estorno de Pix: POST /payments/{id}/refund, total ou PARCIAL (vários parciais são permitidos desde que a soma não passe
  // do valor). Cuidados:
  //   - `valor` omitido = o que ainda resta; informado = EXATAMENTE esse valor (é assim que o tudo-ou-nada devolve o valor e deixa a tarifa paga por cima);
  //   - IDEMPOTÊNCIA: o Asaas não tem chave de idempotência em estorno. A chave do sistema vai na descrição do estorno
  //     ("ref:<chave>") e, antes de estornar, procura-se um estorno da cobrança com esse marcador. Existindo, devolve o
  //     resultado dele sem estornar de novo (um retry do worker nunca devolve o dinheiro duas vezes);
  //   - as taxas da cobrança não são devolvidas pelo Asaas: estornar logo depois de receber pode dar "saldo insuficiente"
  //     (HTTP 400), que vira SALDO_INSUFICIENTE (recuperável: o worker tenta de novo depois de o saldo ser reposto).
  async estornar(
    idCobranca: string,
    valor?: number,
    opcoes?: { chaveIdempotencia?: string },
  ): Promise<ResultadoEstorno> {
    const pagamento = await this.obter(idCobranca);
    if (pagamento.billingType === 'BOLETO') {
      return pedirDevolucaoBoletoAsaas(this.http, idCobranca);
    }
    const jaDevolvido = totalEstornado(pagamento);

    const chave = opcoes?.chaveIdempotencia;
    if (chave) {
      const existente = (pagamento.refunds ?? []).find(
        (r) =>
          (r.description ?? '').includes(marcador(chave)) &&
          !STATUS_ESTORNO_SEM_EFEITO.includes(r.status ?? ''),
      );
      if (existente) {
        return {
          idCobranca,
          valorEstornado: arredondar(existente.value ?? 0),
          valorTotalEstornado: jaDevolvido,
          status: this.statusAposEstorno(pagamento, jaDevolvido),
          concluido: existente.status === 'DONE',
        };
      }
    }

    const restante = arredondar(pagamento.value - jaDevolvido);
    const pedido = arredondar(valor ?? restante);
    if (!(pedido > 0) || pedido > restante) {
      throw new GatewayPagamentoErro(
        'RECUSADO',
        'O valor a estornar é zero ou maior do que ainda resta na cobrança.',
        false,
        400,
      );
    }

    const depois = await this.http.requisitar<AsaasPayment>(
      'POST',
      `/payments/${encodeURIComponent(idCobranca)}/refund`,
      {
        corpo: {
          value: pedido,
          description: chave
            ? `Devolucao CrowdAcademico ${marcador(chave)}`
            : 'Devolucao CrowdAcademico',
        },
      },
    );

    const total = arredondar(jaDevolvido + pedido);
    const criado = chave
      ? (depois.refunds ?? []).find((r) =>
          (r.description ?? '').includes(marcador(chave)),
        )
      : undefined;
    return {
      idCobranca,
      valorEstornado: pedido,
      valorTotalEstornado: total,
      status: this.statusAposEstorno(pagamento, total),
      // Sem como identificar a devolução recém-criada, não se presume concluída: o próximo ciclo confere.
      concluido: criado?.status === 'DONE',
    };
  }

  // DELETE /payments/{id}: só funciona em cobrança ainda não paga. Paga => o Asaas recusa (400) e vira RECUSADO.
  async cancelarCobranca(idCobranca: string): Promise<void> {
    await this.http.requisitar(
      'DELETE',
      `/payments/${encodeURIComponent(idCobranca)}`,
    );
  }

  // A cobrança COM as devoluções dela. O GET /payments/{id} devolve `refunds` vazio (conferido no sandbox): as devoluções
  // só vêm em GET /payments/{id}/refunds. Sem elas, o total devolvido e a busca da devolução já pedida (que impede devolver
  // duas vezes) estariam errados.
  private async obter(idCobranca: string): Promise<AsaasPayment> {
    const id = encodeURIComponent(idCobranca);
    const pagamento = await this.http.requisitar<AsaasPayment>(
      'GET',
      `/payments/${id}`,
    );
    const devolucoes = await this.http.requisitar<AsaasLista<AsaasRefund>>(
      'GET',
      `/payments/${id}/refunds`,
    );
    return { ...pagamento, refunds: devolucoes.data };
  }

  private async buscarPorReferencia(
    referencia: string,
  ): Promise<AsaasPayment | undefined> {
    const lista = await this.http.requisitar<AsaasLista<AsaasPayment>>(
      'GET',
      '/payments',
      { query: { externalReference: referencia, limit: 10 } },
    );
    return lista.data.find(
      (p) => !p.deleted && p.externalReference === referencia,
    );
  }

  private statusAposEstorno(
    pagamento: AsaasPayment,
    totalDevolvido: number,
  ): StatusCobrancaGateway {
    return totalDevolvido >= arredondar(pagamento.value) ||
      pagamento.status === 'REFUNDED'
      ? 'estornada'
      : 'confirmada';
  }

  private paraResultado(pagamento: AsaasPayment): ResultadoCobranca {
    const devolvido = totalEstornado(pagamento);
    const base = statusDeDominio(pagamento);
    return {
      idCobranca: pagamento.id,
      status:
        base === 'confirmada' && devolvido >= arredondar(pagamento.value)
          ? 'estornada'
          : base,
      meioPagamento: MEIO_DO_TIPO_ASAAS[pagamento.billingType ?? ''] ?? 'pix',
      valor: arredondar(pagamento.value),
      valorEstornado: devolvido,
      dinheiroLiberado: STATUS_DINHEIRO_LIBERADO.includes(pagamento.status),
    };
  }
}
