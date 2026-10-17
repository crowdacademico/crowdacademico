import { GatewayPagamentoErro } from '../../dto/erro-gateway-pagamento';
import {
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
  type AsaasLista,
  type AsaasPayment,
  type AsaasPixQrCode,
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

// Cobrança Pix no Asaas. Fluxo de criarCobranca:
//   1. IDEMPOTÊNCIA: o Asaas NÃO tem chave de idempotência. A chave do sistema vai em `externalReference` e, antes de criar,
//      procura-se uma cobrança com essa referência (GET /payments?externalReference=...). Existindo, reaproveita (é o que
//      acontece num retry depois de um timeout). Sem isso, um retry criaria cobrança duplicada.
//   2. cria a cobrança (POST /payments) para o cliente genérico ASAAS_CUSTOMER_ID, forma PIX;
//   3. busca o QR code (GET /payments/{id}/pixQrCode).
// Limites que o desenho respeita:
//   - O vencimento do Asaas é uma DATA, não um instante, e o QR continua pagável por meses depois dele. Por isso o sistema
//     CANCELA a cobrança quando a contribuição expira (cancelarCobranca, chamado pelo job de reconciliação), em vez de
//     confiar no vencimento. `pix.expiraEm` devolvido é a expiração DO SISTEMA (params.expiraEm), não a do QR do Asaas.
//   - Cartão de crédito NÃO é suportado ainda (exige tokenização/fatura hospedada): recusa com mensagem clara.
//   - `split` não é usado: se vier, recusa (nunca ignora em silêncio dinheiro que deveria ser dividido).
export class AsaasCobrancaAdapter implements CobrancaGatewayPort {
  readonly provedor = NOME_PROVEDOR;

  constructor(
    private readonly http: AsaasHttpClient,
    private readonly config: ConfiguracaoAsaas,
  ) {}

  async criarCobranca(params: CriarCobrancaParams): Promise<ResultadoCobranca> {
    if (params.meioPagamento !== 'pix') {
      throw new GatewayPagamentoErro(
        'RECUSADO',
        'Pagamento com cartão ainda não está disponível neste provedor.',
        false,
        400,
      );
    }
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
          billingType: 'PIX',
          value: valor,
          dueDate: dataBrasilia(params.expiraEm),
          description: params.descricao?.slice(0, 500),
          externalReference: params.chaveIdempotencia,
        },
      },
    );

    // A cobrança já existe no Asaas: se o QR falhar, cancela antes de devolver o erro. Sem isso ela ficaria aberta e
    // pagável sem nenhuma contribuição ligada a ela (ninguém recebe o código, mas o Asaas aceitaria o pagamento).
    let qr: AsaasPixQrCode;
    try {
      qr = await this.http.requisitar<AsaasPixQrCode>(
        'GET',
        `/payments/${encodeURIComponent(pagamento.id)}/pixQrCode`,
      );
    } catch (erro) {
      await this.cancelarCobranca(pagamento.id).catch(() => undefined);
      throw erro;
    }

    return {
      ...this.paraResultado(pagamento),
      pix: {
        copiaECola: qr.payload,
        qrCodeBase64: qr.encodedImage,
        expiraEm: params.expiraEm,
      },
    };
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
    const jaDevolvido = totalEstornado(pagamento);

    const chave = opcoes?.chaveIdempotencia;
    if (chave) {
      const existente = (pagamento.refunds ?? []).find(
        (r) =>
          (r.description ?? '').includes(marcador(chave)) &&
          (r.status === 'DONE' || r.status === 'PENDING'),
      );
      if (existente) {
        return {
          idCobranca,
          valorEstornado: arredondar(existente.value ?? 0),
          valorTotalEstornado: jaDevolvido,
          status: this.statusAposEstorno(pagamento, jaDevolvido),
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

    await this.http.requisitar<AsaasPayment>(
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
    return {
      idCobranca,
      valorEstornado: pedido,
      valorTotalEstornado: total,
      status: this.statusAposEstorno(pagamento, total),
    };
  }

  // DELETE /payments/{id}: só funciona em cobrança ainda não paga. Paga => o Asaas recusa (400) e vira RECUSADO.
  async cancelarCobranca(idCobranca: string): Promise<void> {
    await this.http.requisitar(
      'DELETE',
      `/payments/${encodeURIComponent(idCobranca)}`,
    );
  }

  private async obter(idCobranca: string): Promise<AsaasPayment> {
    return this.http.requisitar<AsaasPayment>(
      'GET',
      `/payments/${encodeURIComponent(idCobranca)}`,
    );
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
      meioPagamento:
        pagamento.billingType === 'CREDIT_CARD' ? 'cartao_credito' : 'pix',
      valor: arredondar(pagamento.value),
      valorEstornado: devolvido,
    };
  }
}
