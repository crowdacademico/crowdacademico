import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'kysely';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { DatabaseService } from '../../commons/database/database.service';
import { executarTransacaoCurta } from '../../commons/database/transacao-curta.util';
import { GatewayPagamentoErro } from '../../23-pagamento/ports/erro-gateway-pagamento';
import {
  REPASSE_GATEWAY,
  type RepasseGatewayPort,
} from '../../23-pagamento/ports/repasse-gateway.port';
import type { StatusRepasseGateway } from '../../23-pagamento/dto/resultado-repasse.dto';
import { RepasseAtencaoResponse } from '../dto/response/pagamento-revisao.response';

// Como o provedor descreve a transferência, nas mensagens de recusa do "Marcar como pago".
const SITUACAO_NO_PROVEDOR: Record<StatusRepasseGateway, string> = {
  processando: 'ainda em processamento',
  concluido: 'concluída',
  erro: 'falhou ou foi cancelada',
};

interface LinhaRepasse {
  id_repasse: number;
  id_campanha: number;
  titulo: string;
  status: string;
  valor_liquido: string;
  tentativas: number;
  id_transferencia_api: string | null;
  ultimo_motivo: string | null;
  aguardando_conta: boolean;
}

// Repasses que pedem olhar humano: em 'erro', ou esperando o dono da campanha cadastrar a chave Pix.
@Injectable()
export class PagamentoRevisaoServiceRepasses {
  constructor(
    private readonly database: DatabaseService,
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REPASSE_GATEWAY) private readonly gateway: RepasseGatewayPort,
  ) {}

  async listar(limite = 100): Promise<RepasseAtencaoResponse[]> {
    const resultado = await sql<LinhaRepasse>`
      SELECT * FROM public.listar_repasses_atencao(${limite}::int)
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idRepasse: linha.id_repasse,
      idCampanha: linha.id_campanha,
      titulo: linha.titulo,
      status: linha.status,
      valorLiquido: Number(linha.valor_liquido),
      tentativas: linha.tentativas,
      idTransferenciaApi: linha.id_transferencia_api,
      ultimoMotivo: linha.ultimo_motivo,
      aguardandoConta: linha.aguardando_conta,
    }));
  }

  // erro -> pendente depois de a causa ter sido corrigida. O banco decide se a chave de idempotência troca (só quando o
  // provedor chegou a criar uma transferência e a reportou como falha) e audita com quem fez.
  async reenfileirar(idRepasse: number, observacao: string): Promise<void> {
    await sql`
      SELECT public.reenfileirar_repasse(${idRepasse}::int, ${observacao}::text)
    `.execute(this.database.getDb());
  }

  // erro -> concluido quando o provedor confirma que a transferência foi concluída depois de o sistema marcar erro (o
  // aviso chegou atrasado). Só com a confirmação do provedor, consultado na hora: todo repasse passa pelo processador
  // de pagamento, e nenhum pagamento por fora é registrado. O banco marca as contribuições como repassadas, dá baixa
  // nos avisos em revisão do repasse e audita. Rota sem a transação global (@SemTransacaoGlobal): o banco é lido e
  // gravado em transações curtas, e a consulta ao provedor fica fora delas.
  async marcarPago(
    idRepasse: number,
    observacao: string,
    idUsuario: number,
  ): Promise<void> {
    const repasse = await executarTransacaoCurta(
      this.pool,
      { idUsuario },
      async (client) =>
        (
          await client.query<{
            pode: boolean;
            status: string | null;
            id_transferencia_api: string | null;
          }>(
            `SELECT public.tem_permissao('pagamento_revisao_resolver') AS pode, r.status::text AS status,
                    r.id_transferencia_api
             FROM (SELECT 1) AS x LEFT JOIN repasse r ON r.id_repasse = $1`,
            [idRepasse],
          )
        ).rows[0],
    );
    if (!repasse.pode) {
      throw new ForbiddenException(
        'Sem permissão para marcar repasses como pagos.',
      );
    }
    if (repasse.status !== 'erro') {
      throw new ConflictException(
        'Só um repasse em erro pode ser marcado como pago.',
      );
    }
    if (!repasse.id_transferencia_api) {
      throw new ConflictException(
        'Este repasse não chegou a ter transferência no provedor de pagamento, então não há o que confirmar. Use Reenfileirar.',
      );
    }

    let situacao: StatusRepasseGateway;
    try {
      situacao = (
        await this.gateway.consultarTransferencia(repasse.id_transferencia_api)
      ).status;
    } catch (erro) {
      if (
        erro instanceof GatewayPagamentoErro &&
        erro.codigo === 'NAO_ENCONTRADO'
      ) {
        throw new ConflictException(
          'O provedor de pagamento não encontra esta transferência. Não dá para marcar como pago.',
        );
      }
      throw new ServiceUnavailableException(
        'Não foi possível consultar o provedor de pagamento agora. Tente de novo em instantes.',
      );
    }
    if (situacao !== 'concluido') {
      throw new ConflictException(
        `O provedor de pagamento não confirma esta transferência (situação: ${SITUACAO_NO_PROVEDOR[situacao]}). Não dá para marcar como pago.`,
      );
    }

    await executarTransacaoCurta(this.pool, { idUsuario }, (client) =>
      client.query('SELECT public.marcar_repasse_pago($1::int, $2::text)', [
        idRepasse,
        observacao,
      ]),
    );
  }
}
