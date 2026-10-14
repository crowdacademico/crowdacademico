import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { GatewayPagamentoErro } from '../dto/erro-gateway-pagamento';
import { EventoPagamentoDto } from '../dto/evento-pagamento.dto';
import {
  EventoPagamentoService,
  StatusAplicavelPorEvento,
} from '../evento-pagamento.service';
import {
  COBRANCA_GATEWAY,
  type CobrancaGatewayPort,
} from '../ports/cobranca-gateway.port';
import {
  REPASSE_GATEWAY,
  type RepasseGatewayPort,
} from '../ports/repasse-gateway.port';
import {
  type CabecalhosHttp,
  WEBHOOK_VERIFIER,
  type WebhookVerifierPort,
} from '../ports/webhook-verifier.port';

export interface RespostaWebhook {
  recebido: true;
}

// O que fazer com o evento depois de conferir o estado REAL no gateway.
type Alvo =
  // Aplicar este status. `valor` só no estorno (o que o gateway diz ter devolvido).
  | { acao: 'aplicar'; status: StatusAplicavelPorEvento; valor?: number }
  // Evento que não pede ação (repasse, desconhecido, estorno parcial): só marcar como processado.
  | { acao: 'sem_acao' }
  // O estado real não bate com o evento (ex.: "confirmada" mas o gateway ainda diz "pendente"): não aplica, deixa
  // o evento na fila com o motivo.
  | { acao: 'adiar'; motivo: string };

// POST /pagamento/webhook/:provedor. Ordem das etapas (cada uma só roda se a anterior passou):
//   1. provedor da URL é o que está configurado        (senão 404: não revela quais provedores existem);
//   2. o webhook é AUTÊNTICO                           (senão 401, SEM tocar no banco);
//   3. o corpo é um evento que o adapter entende       (senão 400);
//   4. grava em evento_pagamento ANTES de qualquer processamento (a UNIQUE barra duplicata);
//   5. se já foi processado OU já está em revisão manual, 200 e fim (reprocessar não mudaria nada);
//   6. reconsulta o estado REAL no gateway (nunca confia só no payload) e aplica no banco, atomicamente.
//      Evento de cobrança (cobranca_*) muda a contribuição; evento de repasse (repasse_*) muda o repasse e, se a
//      transferência concluiu, marca as contribuições dele como 'repassado'.
//
// Código de resposta: 200 para tudo que o gateway não ganha nada reenviando (inclusive "aplicamos", "já tínhamos",
// "contribuição não encontrada" e "mandamos para revisão manual"); 5xx SÓ para falha transitória nossa (banco ou gateway fora do
// ar), porque aí a reentrega do gateway É a nova tentativa. Responder 5xx para evento que nunca vai funcionar faria o
// gateway reenviar para sempre, e provedores como o Asaas pausam a fila inteira depois de muitas falhas seguidas.
@Injectable()
export class PagamentoServiceWebhook {
  private readonly logger = new Logger(PagamentoServiceWebhook.name);

  constructor(
    @Inject(WEBHOOK_VERIFIER) private readonly verificador: WebhookVerifierPort,
    @Inject(COBRANCA_GATEWAY) private readonly gateway: CobrancaGatewayPort,
    @Inject(REPASSE_GATEWAY)
    private readonly repasseGateway: RepasseGatewayPort,
    private readonly eventos: EventoPagamentoService,
  ) {}

  async receber(
    provedor: string,
    cabecalhos: CabecalhosHttp,
    corpo: unknown,
  ): Promise<RespostaWebhook> {
    if (provedor !== this.verificador.provedor) {
      throw new NotFoundException();
    }

    if (!this.verificador.verificarAutenticidade(cabecalhos)) {
      // Nunca loga cabeçalho nem corpo: o cabeçalho pode ser o segredo, o corpo é dado do pagador.
      this.logger.warn(
        `Webhook de "${provedor}" recusado: autenticidade não verificada.`,
      );
      throw new UnauthorizedException('Webhook não autenticado.');
    }

    let evento: EventoPagamentoDto;
    try {
      evento = this.verificador.extrairEvento(corpo);
    } catch (erro) {
      if (erro instanceof GatewayPagamentoErro) {
        throw new BadRequestException('Corpo do webhook inválido.');
      }
      throw erro;
    }

    const registro = await this.eventos.registrar(evento);
    if (registro.processado || registro.emRevisao) {
      return { recebido: true };
    }

    await this.processar(registro.idEvento, evento);
    return { recebido: true };
  }

  private async processar(
    idEvento: number,
    evento: EventoPagamentoDto,
  ): Promise<void> {
    if (
      evento.tipoEvento === 'repasse_concluido' ||
      evento.tipoEvento === 'repasse_falhou'
    ) {
      await this.processarRepasse(idEvento, evento);
      return;
    }

    let alvo: Alvo;
    try {
      alvo = await this.decidirAlvo(evento);
    } catch (erro) {
      await this.registrarFalhaSemEsconderOErro(idEvento, erro);
      if (erro instanceof GatewayPagamentoErro && !erro.recuperavel) {
        // Ex.: a cobrança ainda não existe no gateway (evento fora de ordem). A reentrega resolve; responder 5xx só
        // faria o gateway insistir agora, antes de existir algo a reconsultar.
        this.logger.warn(
          `Evento ${idEvento} adiado: ${erro.codigo} ao reconsultar o gateway.`,
        );
        return;
      }
      throw new ServiceUnavailableException(
        'Não foi possível processar o evento agora.',
      );
    }

    if (alvo.acao === 'adiar') {
      await this.eventos.registrarFalha(idEvento, alvo.motivo);
      this.logger.warn(`Evento ${idEvento} adiado: ${alvo.motivo}`);
      return;
    }

    const resultado = await this.eventos.aplicar(
      idEvento,
      evento.provedor,
      evento.idCobranca ?? null,
      alvo.acao === 'aplicar' ? alvo.status : null,
      alvo.acao === 'aplicar' ? alvo.valor : undefined,
    );

    if (resultado === 'revisao_manual') {
      // Nível ERROR de propósito: o gateway diz que o dinheiro se moveu e o sistema NÃO o aplicou (contribuição já
      // expirada, campanha já encerrada, transição proibida). O evento fica com revisao_manual_em e o motivo em
      // erro_processamento, sem estorno automático; alguém precisa decidir. Responde 200: reentregar não adiantaria.
      this.logger.error(
        `Evento ${idEvento} (cobrança ${evento.idCobranca ?? '?'}): não aplicado, em revisão manual (ver evento_pagamento.erro_processamento).`,
      );
    } else if (resultado === 'contribuicao_nao_encontrada') {
      this.logger.warn(
        `Evento ${idEvento}: nenhuma contribuição para a cobrança ${evento.idCobranca ?? '?'}; fica na fila para reentrega.`,
      );
    }
  }

  // Evento de repasse: reconsulta a transferência no provedor e aplica o estado REAL ('concluido' ou 'erro'). Ainda
  // 'processando' no provedor = o aviso veio antes da hora: o evento fica na fila com o motivo (a reentrega, ou o
  // próprio worker de repasse ao vencer o lease, resolve). Mesma regra de erro do evento de cobrança.
  private async processarRepasse(
    idEvento: number,
    evento: EventoPagamentoDto,
  ): Promise<void> {
    if (!evento.idTransferencia) {
      await this.eventos.registrarFalha(
        idEvento,
        'Evento de repasse sem id da transferência.',
      );
      this.logger.warn(`Evento ${idEvento} adiado: sem id da transferência.`);
      return;
    }

    let resultado: Awaited<
      ReturnType<EventoPagamentoService['aplicarRepasse']>
    >;
    try {
      const real = await this.repasseGateway.consultarTransferencia(
        evento.idTransferencia,
      );
      if (real.status === 'processando') {
        const motivo = `A transferência ainda está em processamento no provedor; o evento ${evento.tipoEvento} veio cedo.`;
        await this.eventos.registrarFalha(idEvento, motivo);
        this.logger.warn(`Evento ${idEvento} adiado: ${motivo}`);
        return;
      }
      resultado = await this.eventos.aplicarRepasse(
        idEvento,
        evento.provedor,
        evento.idTransferencia,
        real.status,
        real.motivoFalha,
      );
    } catch (erro) {
      await this.registrarFalhaSemEsconderOErro(idEvento, erro);
      if (erro instanceof GatewayPagamentoErro && !erro.recuperavel) {
        this.logger.warn(
          `Evento ${idEvento} adiado: ${erro.codigo} ao reconsultar a transferência.`,
        );
        return;
      }
      throw new ServiceUnavailableException(
        'Não foi possível processar o evento agora.',
      );
    }

    if (resultado === 'revisao_manual') {
      this.logger.error(
        `Evento ${idEvento} (transferência ${evento.idTransferencia}): não aplicado, em revisão manual (ver evento_pagamento.erro_processamento).`,
      );
    } else if (resultado === 'repasse_nao_encontrado') {
      this.logger.warn(
        `Evento ${idEvento}: nenhum repasse para a transferência ${evento.idTransferencia}; fica na fila para reentrega.`,
      );
    }
  }

  // O estado REAL é a verdade; o evento só diz "vá olhar". O payload do webhook nunca decide sozinho o status.
  private async decidirAlvo(evento: EventoPagamentoDto): Promise<Alvo> {
    switch (evento.tipoEvento) {
      case 'cobranca_confirmada':
      case 'cobranca_expirada':
      case 'cobranca_estornada':
        break;
      default:
        // repasse_* é tratado em processarRepasse; 'desconhecido' a caixa guarda e ignora.
        return { acao: 'sem_acao' };
    }

    if (!evento.idCobranca) {
      return {
        acao: 'adiar',
        motivo: 'Evento de cobrança sem id da cobrança.',
      };
    }
    const real = await this.gateway.consultarCobranca(evento.idCobranca);

    switch (evento.tipoEvento) {
      case 'cobranca_confirmada':
        // 'estornada' conta: pagou e já foi estornada; o evento de estorno aplica o resto depois.
        return real.status === 'confirmada' || real.status === 'estornada'
          ? { acao: 'aplicar', status: 'confirmado' }
          : this.divergente(evento, real.status);
      case 'cobranca_expirada':
        return real.status === 'expirada'
          ? { acao: 'aplicar', status: 'expirado' }
          : this.divergente(evento, real.status);
      default:
        // cobranca_estornada. Estorno TOTAL = contribuição 'reembolsado'. Estorno PARCIAL (cobrança continua
        // 'confirmada' com valor devolvido) é o que o tudo-ou-nada faz ao reter a taxa: quem muda o status é o worker
        // de estorno (PR-07), não o webhook.
        if (real.status === 'estornada') {
          return {
            acao: 'aplicar',
            status: 'reembolsado',
            valor: real.valorEstornado,
          };
        }
        return real.status === 'confirmada' && real.valorEstornado > 0
          ? { acao: 'sem_acao' }
          : this.divergente(evento, real.status);
    }
  }

  private divergente(evento: EventoPagamentoDto, statusReal: string): Alvo {
    return {
      acao: 'adiar',
      motivo: `Estado real da cobrança ("${statusReal}") não confirma o evento ${evento.tipoEvento}.`,
    };
  }

  // Marcar a falha é registro auxiliar: se ele mesmo falhar (banco fora do ar), o erro que importa é o ORIGINAL.
  private async registrarFalhaSemEsconderOErro(
    idEvento: number,
    erro: unknown,
  ): Promise<void> {
    const motivo =
      erro instanceof GatewayPagamentoErro
        ? `Falha ao reconsultar o gateway: ${erro.codigo}.`
        : 'Falha inesperada ao processar o evento.';
    try {
      await this.eventos.registrarFalha(idEvento, motivo);
    } catch (falha) {
      this.logger.error(
        `Não foi possível registrar a falha do evento ${idEvento}.`,
        falha instanceof Error ? falha.stack : String(falha),
      );
    }
    if (!(erro instanceof GatewayPagamentoErro)) {
      this.logger.error(
        `Erro inesperado no evento ${idEvento}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }
  }
}
