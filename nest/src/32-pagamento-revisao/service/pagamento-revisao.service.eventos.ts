import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { type SituacaoRevisao } from '../dto/request/pagamento-revisao.request-list';
import { RevisaoPagamentoResponse } from '../dto/response/pagamento-revisao.response';

interface LinhaRevisao {
  id_evento_pagamento: number;
  provedor: string;
  tipo_evento: string;
  recebido_em: Date;
  situacao: RevisaoPagamentoResponse['situacao'];
  motivo: string | null;
  revisao_manual_em: Date | null;
  id_contribuicao: number | null;
  id_repasse: number | null;
  valor: string | null;
  sentido: RevisaoPagamentoResponse['sentido'];
  arrecadado: string | null;
}

// Todos os avisos do provedor, do mais novo para o mais antigo (a tela Eventos de Pagamento). A permissão é conferida DENTRO das funções do banco (listar exige
// evento_pagamento_visualizar; resolver exige pagamento_revisao_resolver; sem ela, 92037 => 403), com a sessão do usuário
// que o interceptor global já montou (SET LOCAL app.id_usuario_atual): este service não decide quem pode.
@Injectable()
export class PagamentoRevisaoServiceEventos {
  constructor(private readonly database: DatabaseService) {}

  async listar(
    situacao: SituacaoRevisao | undefined,
    limite = 500,
  ): Promise<RevisaoPagamentoResponse[]> {
    const resultado = await sql<LinhaRevisao>`
      SELECT * FROM public.listar_revisoes_pagamento(${situacao ?? null}::text, ${limite}::int)
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idEvento: linha.id_evento_pagamento,
      provedor: linha.provedor,
      tipoEvento: linha.tipo_evento,
      recebidoEm: linha.recebido_em,
      situacao: linha.situacao,
      motivo: linha.motivo,
      revisaoManualEm: linha.revisao_manual_em,
      idContribuicao: linha.id_contribuicao,
      idRepasse: linha.id_repasse,
      valor: linha.valor === null ? null : Number(linha.valor),
      sentido: linha.sentido,
      arrecadado: linha.arrecadado === null ? null : Number(linha.arrecadado),
    }));
  }

  // Dá baixa num evento em revisão depois de a pessoa ter agido fora do sistema. Não muda contribuição nem repasse.
  async resolver(idEvento: number, observacao: string): Promise<void> {
    await sql`
      SELECT public.resolver_revisao_pagamento(${idEvento}::int, ${observacao}::text)
    `.execute(this.database.getDb());
  }
}
