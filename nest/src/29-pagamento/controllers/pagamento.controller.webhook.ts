import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { Publico } from '../../commons/auth/publico.decorator';
import { SemTransacaoGlobal } from '../../commons/database/sem-transacao-global.decorator';
import type { CabecalhosHttp } from '../ports/webhook-verifier.port';
import { PagamentoServiceAuthorizeWithdrawal } from '../service/pagamento.service.authorize-withdrawal';
import {
  PagamentoServiceWebhook,
  type RespostaWebhook,
} from '../service/pagamento.service.webhook';

@Controller('pagamento/webhook')
export class PagamentoControllerWebhook {
  constructor(
    private readonly service: PagamentoServiceWebhook,
    private readonly saque: PagamentoServiceAuthorizeWithdrawal,
  ) {}

  // @Publico(): quem chama é o gateway, não um usuário logado. A autenticidade é verificada pelo
  // WebhookVerifierPort dentro do service, ANTES de qualquer acesso ao banco (para o Asaas, o cabeçalho
  // `asaas-access-token`, PR-10).
  //
  // @SemTransacaoGlobal(): sem sessão, sem RLS, sem BEGIN em volta. O service reconsulta o gateway no meio do
  // caminho, o que não pode ficar dentro de uma transação aberta (ver sem-transacao-global.decorator.ts).
  //
  // Sem @Throttle de propósito: o tráfego é do gateway, em rajadas legítimas (um evento por pagamento). O que protege
  // é a verificação de autenticidade, que é a primeira coisa a rodar e não toca no banco.
  //
  // @HttpCode(200): o Asaas só considera o evento entregue com HTTP 200 exato; 201, 204 e qualquer 3xx/4xx/5xx contam
  // como falha (docs.asaas.com, "Penalização de filas"). O padrão de POST no Nest é 201, por isso o decorator.
  //
  // `:provedor` na URL (e não fixo em "asaas"): a rota continua valendo quando outro provedor entrar. O service
  // responde 404 se não for o provedor configurado.
  @Post(':provedor')
  @HttpCode(200)
  @Publico()
  @SemTransacaoGlobal()
  receber(
    @Param('provedor') provedor: string,
    @Headers() cabecalhos: CabecalhosHttp,
    @Body() corpo: unknown,
  ): Promise<RespostaWebhook> {
    return this.service.receber(provedor, cabecalhos, corpo);
  }

  // Autorização de saque: o provedor pergunta, antes de executar cada transferência, se ela é legítima. Mesma ideia da
  // rota acima (@Publico, sem transação global, verificação de autenticidade antes de tocar no banco), com token PRÓPRIO.
  // A resposta é o corpo que o provedor espera (aprovado/recusado), com HTTP 200.
  @Post(':provedor/autorizacao-saque')
  @HttpCode(200)
  @Publico()
  @SemTransacaoGlobal()
  autorizarSaque(
    @Param('provedor') provedor: string,
    @Headers() cabecalhos: CabecalhosHttp,
    @Body() corpo: unknown,
  ): Promise<unknown> {
    return this.saque.autorizar(provedor, cabecalhos, corpo);
  }
}
