import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { RepasseAtencaoResponse } from '../dto/response/pagamento-revisao.response';

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
  constructor(private readonly database: DatabaseService) {}

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

  // erro -> concluido quando o dinheiro já chegou ao pesquisador (o provedor confirmou depois do erro, ou foi pago por
  // fora). O banco marca as contribuições como repassadas, dá baixa nos avisos em revisão do repasse e audita.
  async marcarPago(idRepasse: number, observacao: string): Promise<void> {
    await sql`
      SELECT public.marcar_repasse_pago(${idRepasse}::int, ${observacao}::text)
    `.execute(this.database.getDb());
  }
}
