import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { DatabaseService } from '../../commons/database/database.service';
import { sql } from 'kysely';
import type { TarifasProvedor } from '../dto/tarifas-provedor.dto';
import {
  COBRANCA_GATEWAY,
  type CobrancaGatewayPort,
} from '../ports/cobranca-gateway.port';

export interface ResultadoSincronizacaoTarifas {
  provedor: string;
  // false = o provedor não informa tarifas (o de teste): nada mudou.
  sincronizado: boolean;
  // Quantos dos 4 parâmetros mudaram.
  alterados: number;
  tarifas: TarifasProvedor | null;
}

// Sincroniza as tarifas com o provedor (16-11-2026). O VALOR COBRADO sempre bate (a cobrança é corrigida pelo líquido que
// o provedor informa, asaas-cobranca.adapter.ts); o que ficava velho era o valor MOSTRADO antes de pagar (modal Apoiar,
// Transparência), que sai dos parâmetros de configuracoes. No cartão (percentual + fixa) nenhuma cobrança revela as duas
// partes, e todo desconto do provedor vence um dia (no sandbox, em 17-01-2027). Roda todo dia às 5h e no botão
// "Sincronizar com o provedor" de Parâmetros (POST /pagamento/tarifas/sincronizar, permissão configuracao_gerenciar). Quem
// grava é sincronizar_tarifas_provedor (05): só o que mudou, e a troca fica no log de auditoria.
@Injectable()
export class PagamentoServiceSyncFees {
  private readonly logger = new Logger(PagamentoServiceSyncFees.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(COBRANCA_GATEWAY) private readonly gateway: CobrancaGatewayPort,
    private readonly database: DatabaseService,
  ) {}

  @Cron('0 5 * * *')
  async executarAgendado(): Promise<void> {
    try {
      const r = await this.sincronizar();
      if (r.sincronizado) {
        this.logger.log(
          `Tarifas do provedor ${r.provedor} conferidas: ${r.alterados} parâmetro(s) atualizado(s).`,
        );
      }
    } catch (erro) {
      this.logger.warn(
        `Não foi possível sincronizar as tarifas com o provedor: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }

  // O botão de Parâmetros: confere a permissão na sessão de quem clicou e sincroniza.
  async sincronizarPeloPainel(): Promise<ResultadoSincronizacaoTarifas> {
    const pode = await sql<{
      pode: boolean;
    }>`SELECT public.tem_permissao('configuracao_gerenciar') AS pode`.execute(
      this.database.getDb(),
    );
    if (!pode.rows[0]?.pode) {
      throw new ForbiddenException(
        'Só quem gerencia os parâmetros sincroniza as tarifas.',
      );
    }
    return this.sincronizar();
  }

  async sincronizar(): Promise<ResultadoSincronizacaoTarifas> {
    const tarifas = await this.gateway.consultarTarifas();
    if (!tarifas) {
      return {
        provedor: this.gateway.provedor,
        sincronizado: false,
        alterados: 0,
        tarifas: null,
      };
    }
    const resultado = await this.pool.query<{ alterados: number }>(
      'SELECT public.sincronizar_tarifas_provedor($1, $2, $3, $4) AS alterados',
      [
        tarifas.pix,
        tarifas.boleto,
        tarifas.cartaoPercentual,
        tarifas.cartaoFixa,
      ],
    );
    return {
      provedor: this.gateway.provedor,
      sincronizado: true,
      alterados: Number(resultado.rows[0]?.alterados ?? 0),
      tarifas,
    };
  }
}
