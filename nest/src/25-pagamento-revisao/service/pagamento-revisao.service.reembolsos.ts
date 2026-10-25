import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'kysely';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { DatabaseService } from '../../commons/database/database.service';
import { executarTransacaoCurta } from '../../commons/database/transacao-curta.util';
import {
  COBRANCA_GATEWAY,
  type CobrancaGatewayPort,
} from '../../23-pagamento/ports/cobranca-gateway.port';
import { GatewayPagamentoErro } from '../../23-pagamento/ports/erro-gateway-pagamento';
import { ReembolsoManualResponse } from '../dto/response/pagamento-revisao.response';

interface LinhaReembolso {
  id_contribuicao: number;
  id_campanha: number;
  id_usuario: number | null;
  valor_bruto: string;
  valor_a_devolver: string;
  meio_pagamento: string;
  tentativas: number;
  ultimo_motivo: string | null;
  contribuinte_tem_conta_verificada: boolean;
}

// Contribuições em 'reembolso_manual': o estorno automático desistiu e uma pessoa devolve o dinheiro pelo painel do
// provedor de pagamento. Aqui só se lista e se REGISTRA a devolução, depois de conferir com o provedor que ela foi
// feita; nada move dinheiro e não existe devolução por fora do processador.
@Injectable()
export class PagamentoRevisaoServiceReembolsos {
  constructor(
    private readonly database: DatabaseService,
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(COBRANCA_GATEWAY) private readonly gateway: CobrancaGatewayPort,
  ) {}

  async listar(limite = 100): Promise<ReembolsoManualResponse[]> {
    const resultado = await sql<LinhaReembolso>`
      SELECT * FROM public.listar_reembolsos_manuais(${limite}::int)
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idContribuicao: linha.id_contribuicao,
      idCampanha: linha.id_campanha,
      idUsuario: linha.id_usuario,
      valorBruto: Number(linha.valor_bruto),
      valorADevolver: Number(linha.valor_a_devolver),
      meioPagamento: linha.meio_pagamento,
      tentativas: linha.tentativas,
      ultimoMotivo: linha.ultimo_motivo,
      contribuinteTemContaVerificada: linha.contribuinte_tem_conta_verificada,
    }));
  }

  // reembolso_manual -> devolvido, sempre com o valor inteiro da contribuição, e só se o provedor mostrar a devolução:
  // o que ele já devolveu nesta cobrança (só devoluções concluídas) cobre o valor da contribuição. O banco confere o
  // status e o valor. Rota sem a transação global (@SemTransacaoGlobal): o banco é lido e gravado em transações
  // curtas, e a consulta ao provedor fica fora delas.
  async concluir(
    idContribuicao: number,
    valor: number,
    observacao: string,
    idUsuario: number,
  ): Promise<void> {
    const contribuicao = await executarTransacaoCurta(
      this.pool,
      { idUsuario },
      async (client) =>
        (
          await client.query<{
            pode: boolean;
            status: string | null;
            id_transacao_api: string | null;
            valor: string | null;
          }>(
            `SELECT public.tem_permissao('pagamento_revisao_resolver') AS pode, c.status::text AS status,
                    c.id_transacao_api, c.valor
             FROM (SELECT 1) AS x LEFT JOIN contribuicao c ON c.id_contribuicao = $1`,
            [idContribuicao],
          )
        ).rows[0],
    );
    if (!contribuicao.pode) {
      throw new ForbiddenException('Sem permissão para registrar devoluções.');
    }
    if (contribuicao.status === null) {
      throw new NotFoundException('Contribuição não encontrada.');
    }
    if (contribuicao.status !== 'reembolso_manual') {
      throw new ConflictException(
        'Só uma contribuição em reembolso manual pode ter a devolução registrada.',
      );
    }
    if (!contribuicao.id_transacao_api) {
      throw new ConflictException(
        'Esta contribuição não tem cobrança no provedor de pagamento, então não há devolução para conferir.',
      );
    }

    let devolvido: number;
    try {
      devolvido = (
        await this.gateway.consultarCobranca(contribuicao.id_transacao_api)
      ).valorEstornado;
    } catch (erro) {
      if (
        erro instanceof GatewayPagamentoErro &&
        erro.codigo === 'NAO_ENCONTRADO'
      ) {
        throw new ConflictException(
          'O provedor de pagamento não encontra a cobrança desta contribuição. Não dá para registrar a devolução.',
        );
      }
      throw new ServiceUnavailableException(
        'Não foi possível consultar o provedor de pagamento agora. Tente de novo em instantes.',
      );
    }
    const aDevolver = Number(contribuicao.valor);
    if (devolvido + 0.005 < aDevolver) {
      throw new ConflictException(
        `O provedor de pagamento não mostra a devolução desta contribuição (devolvido no provedor: ${reais(devolvido)} de ${reais(aDevolver)}). Faça a devolução pelo painel do provedor e registre de novo.`,
      );
    }

    await executarTransacaoCurta(this.pool, { idUsuario }, (client) =>
      client.query(
        'SELECT public.concluir_reembolso_manual($1::int, $2::numeric, $3::text)',
        [idContribuicao, valor, observacao],
      ),
    );
  }
}

function reais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
