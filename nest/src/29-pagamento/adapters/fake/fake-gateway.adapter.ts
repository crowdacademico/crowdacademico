import { createHash, timingSafeEqual } from 'crypto';
import { OnModuleDestroy } from '@nestjs/common';
import { EventoPagamentoDto } from '../../dto/evento-pagamento.dto';
import { AutorizacaoSaqueDto } from '../../dto/autorizacao-saque.dto';
import { GatewayPagamentoErro } from '../../ports/erro-gateway-pagamento';
import {
  ResultadoCobranca,
  ResultadoEstorno,
} from '../../dto/resultado-cobranca.dto';
import { ResultadoConsultaChavePix } from '../../dto/resultado-chave-pix.dto';
import { ResultadoRepasse } from '../../dto/resultado-repasse.dto';
import {
  CobrancaGatewayPort,
  CriarCobrancaParams,
} from '../../ports/cobranca-gateway.port';
import {
  RepasseGatewayPort,
  TransferirParams,
} from '../../ports/repasse-gateway.port';
import {
  CabecalhosHttp,
  WebhookVerifierPort,
} from '../../ports/webhook-verifier.port';

// Gateway de mentira, 100% em memória, sem rede. Implementa as TRÊS portas (cobrança, repasse e verificação de
// webhook) numa classe só porque um gateway real também faz as três coisas. Serve para:
//  - validar a arquitetura de portas antes de existir qualquer código específico de provedor;
//  - testar ponta a ponta (PR-04 em diante) sem credencial, sem rede e sem sandbox;
//  - reproduzir à vontade o que um gateway real faz de ruim: confirmar tarde, repetir webhook, mandar evento fora
//    de ordem, cair a rede, recusar estorno por saldo.
//
// Estado só vive no processo: reiniciar apaga tudo. NUNCA usar em produção (PagamentoModule recusa subir assim).

export const NOME_PROVEDOR_FAKE = 'fake';
export const CABECALHO_TOKEN_FAKE = 'x-fake-token';
export const TOKEN_WEBHOOK_FAKE_PADRAO = 'token-webhook-fake';

export interface ModosFake {
  // criarCobranca lança GatewayPagamentoErro('REDE'). Não registra a chave de idempotência: o retry com a mesma
  // chave depois que a rede "voltar" tem que funcionar.
  falhaRedeEmCriarCobranca: boolean;
  falhaRedeEmTransferir: boolean;
  // estornar lança GatewayPagamentoErro('SALDO_INSUFICIENTE') com httpStatusEquivalente 400, o mesmo que o Asaas
  // devolve (recuperável: o saldo pode ser reposto).
  saldoInsuficienteNoEstorno: boolean;
}

export interface OpcoesFake {
  // Se informado, toda cobrança criada se confirma sozinha depois deste tempo (e emite o webhook). Omitido = só
  // confirma quando o teste chamar confirmarCobranca().
  atrasoConfirmacaoMs?: number;
  // Idem para transferência.
  atrasoConclusaoRepasseMs?: number;
  // Token que o "provedor" manda no webhook. Padrão fixo, só serve para teste.
  tokenWebhook?: string;
}

// O que o Fake "manda" no webhook. Formato próprio do Fake, de propósito diferente do EventoPagamentoDto: assim
// extrairEvento() faz de verdade o trabalho de tradução que o adapter real fará.
export interface PayloadWebhookFake {
  id: string;
  event: string;
  payment?: { id: string };
  transfer?: { id: string };
}

interface CobrancaFake extends ResultadoCobranca {
  chaveIdempotencia: string;
  estornosPorChave: Map<string, ResultadoEstorno>;
}

interface RepasseFake extends ResultadoRepasse {
  chaveIdempotencia: string;
}

type OuvinteWebhook = (payload: PayloadWebhookFake) => void;

const arredondar2 = (n: number): number => Math.round(n * 100) / 100;

const TIPOS_EVENTO: Record<string, EventoPagamentoDto['tipoEvento']> = {
  FAKE_PAYMENT_CONFIRMED: 'cobranca_confirmada',
  // Cartão: o dinheiro foi liberado (no Asaas, PAYMENT_RECEIVED cerca de 30 dias depois da confirmação).
  FAKE_PAYMENT_RECEIVED: 'cobranca_confirmada',
  FAKE_PAYMENT_EXPIRED: 'cobranca_expirada',
  FAKE_PAYMENT_REFUNDED: 'cobranca_estornada',
  FAKE_TRANSFER_DONE: 'repasse_concluido',
  FAKE_TRANSFER_FAILED: 'repasse_falhou',
};

export class FakeGatewayAdapter
  implements
    CobrancaGatewayPort,
    RepasseGatewayPort,
    WebhookVerifierPort,
    OnModuleDestroy
{
  readonly provedor = NOME_PROVEDOR_FAKE;

  private readonly cobrancas = new Map<string, CobrancaFake>();
  private readonly cobrancaPorChave = new Map<string, string>();
  private readonly repasses = new Map<string, RepasseFake>();
  private readonly repassePorChave = new Map<string, string>();
  private readonly chavesPix = new Map<
    string,
    { documento?: string; nome?: string }
  >();
  private readonly ouvintes: OuvinteWebhook[] = [];
  private readonly eventos: PayloadWebhookFake[] = [];
  private readonly idsReservados: string[] = [];
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly modos: ModosFake = {
    falhaRedeEmCriarCobranca: false,
    falhaRedeEmTransferir: false,
    saldoInsuficienteNoEstorno: false,
  };
  private contadorCobranca = 0;
  private contadorRepasse = 0;
  private contadorEvento = 0;

  constructor(private readonly opcoes: OpcoesFake = {}) {}

  onModuleDestroy(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  // ------------------------------------------------------------------------------------------------------------
  // Controles de teste (não fazem parte de nenhuma porta)
  // ------------------------------------------------------------------------------------------------------------

  configurar(modos: Partial<ModosFake>): void {
    Object.assign(this.modos, modos);
  }

  // Quem quiser "receber" os webhooks do Fake (os testes de PR-05 plugam o handler aqui).
  aoEmitirEvento(ouvinte: OuvinteWebhook): void {
    this.ouvintes.push(ouvinte);
  }

  get eventosEmitidos(): readonly PayloadWebhookFake[] {
    return this.eventos;
  }

  // Webhook DUPLICADO: reenvia o mesmo evento, com o mesmo id, como um gateway real faz quando não recebe o 200 a
  // tempo. Quem recebe tem que tratar sem reprocessar (UNIQUE de evento_pagamento).
  reenviarEvento(idEventoExterno: string): void {
    const original = this.eventos.find((e) => e.id === idEventoExterno);
    if (!original) {
      throw new Error(`Evento fake inexistente: ${idEventoExterno}`);
    }
    this.notificar(original);
  }

  // Webhook FORA DE ORDEM: reserva o id da PRÓXIMA cobrança e já emite a confirmação dela, antes de a cobrança
  // existir. Quando criarCobranca() rodar, usa esse id e a cobrança já nasce 'confirmada' (o estado que o provedor
  // teria). Devolve o id reservado.
  forcarConfirmacaoAntesDaCriacao(): string {
    const id = this.proximoIdCobranca();
    this.idsReservados.push(id);
    this.emitir('FAKE_PAYMENT_CONFIRMED', { payment: { id } });
    return id;
  }

  // Confirmação manual (ou a automática, se atrasoConfirmacaoMs foi informado). Idempotente: confirmar duas vezes
  // não emite dois eventos.
  confirmarCobranca(idCobranca: string): void {
    const c = this.obterCobranca(idCobranca);
    if (c.status !== 'pendente') return;
    c.status = 'confirmada';
    // Pix e boleto: o dinheiro já está disponível. Cartão: só quando liberarCobranca() for chamado.
    c.dinheiroLiberado = c.meioPagamento !== 'cartao_credito';
    this.emitir('FAKE_PAYMENT_CONFIRMED', { payment: { id: idCobranca } });
  }

  // Cartão: o provedor libera o dinheiro (no Asaas, cerca de 30 dias depois do pagamento). Idempotente.
  liberarCobranca(idCobranca: string): void {
    const c = this.obterCobranca(idCobranca);
    if (c.status !== 'confirmada' || c.dinheiroLiberado) return;
    c.dinheiroLiberado = true;
    this.emitir('FAKE_PAYMENT_RECEIVED', { payment: { id: idCobranca } });
  }

  // Cancela uma cobrança aberta (a mesma coisa de expirar, sem emitir evento: quem cancela é o próprio sistema).
  cancelarCobranca(idCobranca: string): Promise<void> {
    const c = this.cobrancas.get(idCobranca);
    if (!c) {
      return Promise.reject(
        new GatewayPagamentoErro(
          'NAO_ENCONTRADO',
          'Cobrança não encontrada.',
          false,
          404,
        ),
      );
    }
    if (c.status === 'pendente') {
      c.status = 'expirada';
      return Promise.resolve();
    }
    if (c.status === 'expirada') return Promise.resolve();
    return Promise.reject(
      new GatewayPagamentoErro(
        'RECUSADO',
        'A cobrança não pode mais ser cancelada.',
        false,
        400,
      ),
    );
  }

  expirarCobranca(idCobranca: string): void {
    const c = this.obterCobranca(idCobranca);
    if (c.status !== 'pendente') return;
    c.status = 'expirada';
    this.emitir('FAKE_PAYMENT_EXPIRED', { payment: { id: idCobranca } });
  }

  concluirTransferencia(idTransferencia: string, falhou = false): void {
    const r = this.obterRepasse(idTransferencia);
    if (r.status !== 'processando') return;
    if (falhou) {
      r.status = 'erro';
      r.motivoFalha = 'Falha simulada pelo FakeGatewayAdapter';
      this.emitir('FAKE_TRANSFER_FAILED', {
        transfer: { id: idTransferencia },
      });
    } else {
      r.status = 'concluido';
      this.emitir('FAKE_TRANSFER_DONE', { transfer: { id: idTransferencia } });
    }
  }

  // ------------------------------------------------------------------------------------------------------------
  // CobrancaGatewayPort
  // ------------------------------------------------------------------------------------------------------------

  criarCobranca(params: CriarCobrancaParams): Promise<ResultadoCobranca> {
    if (this.modos.falhaRedeEmCriarCobranca) {
      return Promise.reject(
        new GatewayPagamentoErro(
          'REDE',
          'Falha de rede simulada ao criar cobrança.',
          true,
        ),
      );
    }

    // Idempotência: mesma chave devolve a MESMA cobrança, sem criar outra.
    const idExistente = this.cobrancaPorChave.get(params.chaveIdempotencia);
    if (idExistente) {
      return Promise.resolve(this.copiaCobranca(idExistente));
    }

    if (!(params.valor > 0)) {
      return Promise.reject(
        new GatewayPagamentoErro(
          'RECUSADO',
          'Valor da cobrança precisa ser maior que zero.',
          false,
          400,
        ),
      );
    }

    const idReservado = this.idsReservados.shift();
    const idCobranca = idReservado ?? this.proximoIdCobranca();

    const cobranca: CobrancaFake = {
      idCobranca,
      // Cobrança cuja confirmação "chegou antes" já nasce confirmada.
      status: idReservado ? 'confirmada' : 'pendente',
      meioPagamento: params.meioPagamento,
      valor: arredondar2(params.valor),
      valorEstornado: 0,
      chaveIdempotencia: params.chaveIdempotencia,
      estornosPorChave: new Map(),
    };
    if (params.meioPagamento === 'cartao_credito') {
      cobranca.linkPagamento = `https://fake.local/pagar/${idCobranca}`;
    }
    if (params.meioPagamento === 'boleto') {
      cobranca.boleto = {
        link: `https://fake.local/boleto/${idCobranca}`,
        linhaDigitavel: `00190.00009 FAKE ${idCobranca}`,
        venceEm: params.expiraEm,
      };
    }
    if (params.meioPagamento === 'pix') {
      cobranca.pix = {
        copiaECola: `00020126FAKE${idCobranca}`,
        qrCodeBase64: Buffer.from(`QR:${idCobranca}`).toString('base64'),
        expiraEm: params.expiraEm,
      };
    }
    if (params.split) {
      cobranca.idSplit = `fake_split_${idCobranca}`;
    }

    this.cobrancas.set(idCobranca, cobranca);
    this.cobrancaPorChave.set(params.chaveIdempotencia, idCobranca);

    if (cobranca.status === 'pendente') {
      this.agendar(this.opcoes.atrasoConfirmacaoMs, () =>
        this.confirmarCobranca(idCobranca),
      );
    }
    return Promise.resolve(this.copiaCobranca(idCobranca));
  }

  consultarCobranca(idCobranca: string): Promise<ResultadoCobranca> {
    const c = this.cobrancas.get(idCobranca);
    if (!c) {
      return Promise.reject(this.naoEncontrado('Cobrança', idCobranca));
    }
    return Promise.resolve(this.copiaCobranca(idCobranca));
  }

  estornar(
    idCobranca: string,
    valor?: number,
    opcoes?: { chaveIdempotencia?: string },
  ): Promise<ResultadoEstorno> {
    if (this.modos.saldoInsuficienteNoEstorno) {
      return Promise.reject(
        new GatewayPagamentoErro(
          'SALDO_INSUFICIENTE',
          'Saldo insuficiente para realizar o estorno.',
          true,
          400,
        ),
      );
    }

    const c = this.cobrancas.get(idCobranca);
    if (!c) {
      return Promise.reject(this.naoEncontrado('Cobrança', idCobranca));
    }

    // Boleto: como no Asaas, o provedor não devolve sozinho; gera um link para quem pagou informar a conta.
    if (c.meioPagamento === 'boleto') {
      return Promise.reject(
        new GatewayPagamentoErro(
          'RECUSADO',
          `Boleto: envie a quem apoiou o link para informar a conta da devolução: https://fake.local/devolucao/${idCobranca}`,
          false,
        ),
      );
    }

    // Retry do worker com a mesma chave: devolve o resultado anterior, sem estornar de novo.
    const chave = opcoes?.chaveIdempotencia;
    const anterior = chave ? c.estornosPorChave.get(chave) : undefined;
    if (anterior) return Promise.resolve({ ...anterior });

    if (c.status !== 'confirmada') {
      return Promise.reject(
        new GatewayPagamentoErro(
          'RECUSADO',
          `Só é possível estornar cobrança confirmada (status atual: ${c.status}).`,
          false,
          400,
        ),
      );
    }

    const restante = arredondar2(c.valor - c.valorEstornado);
    // Valor omitido = devolve tudo que ainda resta. Valor informado = EXATAMENTE esse valor, nunca o cheio.
    const aEstornar = valor === undefined ? restante : arredondar2(valor);
    if (!(aEstornar > 0) || aEstornar > restante) {
      return Promise.reject(
        new GatewayPagamentoErro(
          'RECUSADO',
          `Valor de estorno inválido (${aEstornar}); restante estornável: ${restante}.`,
          false,
          400,
        ),
      );
    }

    c.valorEstornado = arredondar2(c.valorEstornado + aEstornar);
    if (c.valorEstornado >= c.valor) c.status = 'estornada';

    const resultado: ResultadoEstorno = {
      idCobranca,
      valorEstornado: aEstornar,
      valorTotalEstornado: c.valorEstornado,
      status: c.status,
      concluido: true,
    };
    if (chave) c.estornosPorChave.set(chave, resultado);
    this.emitir('FAKE_PAYMENT_REFUNDED', { payment: { id: idCobranca } });
    return Promise.resolve({ ...resultado });
  }

  // ------------------------------------------------------------------------------------------------------------
  // RepasseGatewayPort
  // ------------------------------------------------------------------------------------------------------------

  transferir(params: TransferirParams): Promise<ResultadoRepasse> {
    if (this.modos.falhaRedeEmTransferir) {
      return Promise.reject(
        new GatewayPagamentoErro(
          'REDE',
          'Falha de rede simulada ao transferir.',
          true,
        ),
      );
    }

    const idExistente = this.repassePorChave.get(params.chaveIdempotencia);
    if (idExistente) {
      return Promise.resolve(this.copiaRepasse(idExistente));
    }

    if (!(params.valor > 0)) {
      return Promise.reject(
        new GatewayPagamentoErro(
          'RECUSADO',
          'Valor da transferência precisa ser maior que zero.',
          false,
          400,
        ),
      );
    }

    this.contadorRepasse += 1;
    const idTransferencia = `fake_trf_${String(this.contadorRepasse).padStart(6, '0')}`;
    this.repasses.set(idTransferencia, {
      idTransferencia,
      status: 'processando',
      valor: arredondar2(params.valor),
      chaveIdempotencia: params.chaveIdempotencia,
    });
    this.repassePorChave.set(params.chaveIdempotencia, idTransferencia);
    this.agendar(this.opcoes.atrasoConclusaoRepasseMs, () =>
      this.concluirTransferencia(idTransferencia),
    );
    return Promise.resolve(this.copiaRepasse(idTransferencia));
  }

  // Ajuda de teste/dev: define quem é o titular de uma chave Pix no "diretório" do Fake.
  registrarChavePix(chave: string, documento?: string, nome?: string): void {
    this.chavesPix.set(chave, { documento, nome });
  }

  // DICT de mentira. Chave registrada: devolve o titular registrado. Não registrada: uma chave CPF pertence ao próprio
  // CPF (comodidade para desenvolver); qualquer outra "existe" sem titular conhecido (a verificação automática não
  // fecha e a conta fica pendente de confirmação).
  consultarChavePix(destino: {
    tipoChave: string;
    chave: string;
  }): Promise<ResultadoConsultaChavePix> {
    const registrada = this.chavesPix.get(destino.chave);
    if (registrada) {
      return Promise.resolve({
        existe: true,
        documentoTitular: registrada.documento,
        nomeTitular: registrada.nome,
      });
    }
    return Promise.resolve({
      existe: true,
      documentoTitular: destino.tipoChave === 'cpf' ? destino.chave : undefined,
    });
  }

  consultarTransferencia(idTransferencia: string): Promise<ResultadoRepasse> {
    if (!this.repasses.has(idTransferencia)) {
      return Promise.reject(
        this.naoEncontrado('Transferência', idTransferencia),
      );
    }
    return Promise.resolve(this.copiaRepasse(idTransferencia));
  }

  // ------------------------------------------------------------------------------------------------------------
  // WebhookVerifierPort
  // ------------------------------------------------------------------------------------------------------------

  // O Fake aprova qualquer saque que o chamador diga conhecer: serve só para exercitar o endpoint em desenvolvimento.
  verificarAutenticidadeSaque(cabecalhos: CabecalhosHttp): boolean {
    return this.verificarAutenticidade(cabecalhos);
  }

  extrairAutorizacaoSaque(corpo: unknown): AutorizacaoSaqueDto {
    const c = (corpo ?? {}) as Record<string, unknown>;
    const t = (c['transfer'] ?? {}) as Record<string, unknown>;
    return {
      tipo: c['type'] === 'TRANSFER' ? 'transferencia' : 'outro',
      idTransferencia: typeof t['id'] === 'string' ? t['id'] : undefined,
      referenciaExterna:
        typeof t['externalReference'] === 'string'
          ? t['externalReference']
          : undefined,
      valor: typeof t['value'] === 'number' ? t['value'] : undefined,
      chavePixDestino:
        typeof t['pixAddressKey'] === 'string' ? t['pixAddressKey'] : undefined,
    };
  }

  montarRespostaAutorizacaoSaque(aprovado: boolean, motivo?: string): unknown {
    return aprovado
      ? { status: 'APPROVED' }
      : { status: 'REFUSED', refuseReason: motivo };
  }

  verificarAutenticidade(cabecalhos: CabecalhosHttp): boolean {
    const bruto = cabecalhos[CABECALHO_TOKEN_FAKE];
    const recebido = Array.isArray(bruto) ? bruto[0] : bruto;
    if (typeof recebido !== 'string' || recebido === '') return false;

    // Compara o hash dos dois lados: timingSafeEqual exige o mesmo tamanho e, assim, o tamanho do token real
    // também não vaza pelo tempo da resposta.
    const hash = (s: string) => createHash('sha256').update(s).digest();
    return timingSafeEqual(
      hash(recebido),
      hash(this.opcoes.tokenWebhook ?? TOKEN_WEBHOOK_FAKE_PADRAO),
    );
  }

  extrairEvento(corpo: unknown): EventoPagamentoDto {
    const p = corpo as Partial<PayloadWebhookFake> | null;
    if (
      typeof p !== 'object' ||
      p === null ||
      typeof p.id !== 'string' ||
      typeof p.event !== 'string'
    ) {
      throw new GatewayPagamentoErro(
        'RECUSADO',
        'Corpo de webhook do Fake em formato inválido.',
        false,
        400,
      );
    }
    return {
      provedor: this.provedor,
      idEventoExterno: p.id,
      tipoEvento: TIPOS_EVENTO[p.event] ?? 'desconhecido',
      tipoEventoOriginal: p.event,
      idCobranca: p.payment?.id,
      idTransferencia: p.transfer?.id,
      payload: corpo,
    };
  }

  // ------------------------------------------------------------------------------------------------------------
  // Internos
  // ------------------------------------------------------------------------------------------------------------

  private proximoIdCobranca(): string {
    this.contadorCobranca += 1;
    return `fake_pay_${String(this.contadorCobranca).padStart(6, '0')}`;
  }

  private emitir(
    event: string,
    corpo: Pick<PayloadWebhookFake, 'payment' | 'transfer'>,
  ): void {
    this.contadorEvento += 1;
    const payload: PayloadWebhookFake = {
      id: `fake_evt_${String(this.contadorEvento).padStart(6, '0')}`,
      event,
      ...corpo,
    };
    this.eventos.push(payload);
    this.notificar(payload);
  }

  private notificar(payload: PayloadWebhookFake): void {
    for (const ouvinte of this.ouvintes) ouvinte(payload);
  }

  private agendar(atrasoMs: number | undefined, acao: () => void): void {
    if (atrasoMs === undefined) return;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      acao();
    }, atrasoMs);
    // Não segura o processo (nem o jest) vivo só por causa de um timer de simulação.
    timer.unref();
    this.timers.add(timer);
  }

  private obterCobranca(id: string): CobrancaFake {
    const c = this.cobrancas.get(id);
    if (!c) throw this.naoEncontrado('Cobrança', id);
    return c;
  }

  private obterRepasse(id: string): RepasseFake {
    const r = this.repasses.get(id);
    if (!r) throw this.naoEncontrado('Transferência', id);
    return r;
  }

  // Cópia sem os campos internos do Fake: quem chama só enxerga o ResultadoCobranca da porta, e mutar o resultado
  // devolvido nunca altera o estado do "provedor".
  private copiaCobranca(id: string): ResultadoCobranca {
    const c = this.obterCobranca(id);
    const resultado: ResultadoCobranca = {
      idCobranca: c.idCobranca,
      status: c.status,
      meioPagamento: c.meioPagamento,
      valor: c.valor,
      valorEstornado: c.valorEstornado,
      dinheiroLiberado: c.dinheiroLiberado === true,
    };
    if (c.pix) resultado.pix = { ...c.pix };
    if (c.linkPagamento) resultado.linkPagamento = c.linkPagamento;
    if (c.boleto) resultado.boleto = { ...c.boleto };
    if (c.idSplit) resultado.idSplit = c.idSplit;
    return resultado;
  }

  private copiaRepasse(id: string): ResultadoRepasse {
    const r = this.obterRepasse(id);
    const resultado: ResultadoRepasse = {
      idTransferencia: r.idTransferencia,
      status: r.status,
      valor: r.valor,
    };
    if (r.motivoFalha) resultado.motivoFalha = r.motivoFalha;
    return resultado;
  }

  private naoEncontrado(o: string, id: string): GatewayPagamentoErro {
    return new GatewayPagamentoErro(
      'NAO_ENCONTRADO',
      `${o} não encontrada no Fake: ${id}`,
      false,
      404,
    );
  }
}
