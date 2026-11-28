import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { executarTransacaoCurta } from '../../commons/database/transacao-curta.util';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import {
  COBRANCA_GATEWAY,
  type CobrancaGatewayPort,
} from '../../23-pagamento/ports/cobranca-gateway.port';
import { GatewayPagamentoErro } from '../../23-pagamento/ports/erro-gateway-pagamento';

interface LinhaContribuicao {
  status: string;
  meio_pagamento: string;
  provedor: string;
  id_transacao_api: string | null;
}

const MENSAGEM_SO_TESTE =
  'Simular pagamento só existe no ambiente de testes do provedor de pagamento.';

// POST /contribuicao/:id/simular-pagamento (25-11-2026, Lucas). SÓ NO SANDBOX: no lugar de abrir o painel do Asaas e
// clicar em "Confirmar pagamento" a cada Pix, o botão da tela do QR pede o mesmo ao Asaas pela API. Este service NÃO
// confirma nada no banco: o Asaas manda o webhook de sempre, e é ele que confirma a contribuição (o caminho testado fica
// o mesmo da produção). Quem enxerga a contribuição é a RLS, como em GET /contribuicao/:id (login ou X-Token-Sessao):
// contribuição de outra pessoa dá 404. SÓ EM DESENVOLVIMENTO (orientador, 28-11-2026): o adapter só simula com
// ASAAS_SIMULAR_PAGAMENTO=true, que fica fora do Render; lá ele recusa sem chamar nada, e a tela nem mostra o botão
// (pix.podeSimularPagamento só vem com a variável ligada).
@Injectable()
export class ContribuicaoServiceSimulatePayment {
  private readonly logger = new Logger(ContribuicaoServiceSimulatePayment.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(COBRANCA_GATEWAY) private readonly gateway: CobrancaGatewayPort,
  ) {}

  async executar(
    idContribuicao: number,
    usuario: UsuarioAutenticado | undefined,
    tokenSessao: string | undefined,
  ): Promise<void> {
    if (!this.gateway.simularPagamento) {
      throw new NotFoundException(MENSAGEM_SO_TESTE);
    }
    const linha = await executarTransacaoCurta<LinhaContribuicao | undefined>(
      this.pool,
      { idUsuario: usuario?.idUsuario, tokenSessao },
      async (client) => {
        const resultado = await client.query<LinhaContribuicao>(
          `SELECT status, meio_pagamento, provedor, id_transacao_api
           FROM contribuicao WHERE id_contribuicao = $1`,
          [idContribuicao],
        );
        return resultado.rows[0];
      },
    );
    if (!linha) {
      throw new NotFoundException('Contribuição não encontrada.');
    }
    if (
      linha.status !== 'pendente' ||
      !linha.id_transacao_api ||
      linha.provedor !== this.gateway.provedor
    ) {
      throw new ConflictException(
        'Esta contribuição não está aguardando pagamento.',
      );
    }

    try {
      await this.gateway.simularPagamento(linha.id_transacao_api);
    } catch (erro) {
      if (erro instanceof GatewayPagamentoErro) {
        this.logger.warn(
          `Simular pagamento da contribuição ${idContribuicao} falhou: ${erro.codigo} - ${erro.message}`,
        );
      } else {
        this.logger.error(
          `Erro inesperado ao simular pagamento da contribuição ${idContribuicao}`,
          erro instanceof Error ? erro.stack : String(erro),
        );
      }
      throw new BadGatewayException(
        'O provedor de pagamento não aceitou simular este pagamento. Use o "Confirmar pagamento" do painel dele.',
      );
    }
  }
}
