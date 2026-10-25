import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { AuditoriaFinanceiraResponse } from '../dto/response/pagamento-revisao.response';

interface LinhaAuditoria {
  id_auditoria: number;
  id_contribuicao: number | null;
  id_repasse: number | null;
  id_evento_pagamento: number | null;
  valor: string;
  meio_pagamento: string | null;
  status_anterior: string | null;
  status_novo: string;
  evento: string | null;
  id_usuario_responsavel: number | null;
  nome_responsavel: string | null;
  ocorrido_em: Date;
}

// Auditoria financeira, só leitura, a mais nova primeiro (pela data do acontecimento). A RLS (pol_auditoria_select,
// 04) também mostra a quem contribuiu as linhas da própria contribuição; a tela é de quem tem
// auditoria_financeira_visualizar (admin e revisor), então sem ela é 403, e não uma lista pela metade.
@Injectable()
export class PagamentoRevisaoServiceAuditoria {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async listar(limite = 500): Promise<AuditoriaFinanceiraResponse[]> {
    await this.autorizacao.exigirPermissao(
      'auditoria_financeira_visualizar',
      'Você não tem permissão para ver a auditoria financeira.',
    );
    const resultado = await sql<LinhaAuditoria>`
      SELECT a.id_auditoria, a.id_contribuicao, a.id_repasse, a.id_evento_pagamento, a.valor, a.meio_pagamento::text,
             a.status_anterior, a.status_novo, a.evento, a.id_usuario_responsavel, u.nome AS nome_responsavel,
             a.timestamp AS ocorrido_em
      FROM auditoria_financeira a
      LEFT JOIN usuario u ON u.id_usuario = a.id_usuario_responsavel
      ORDER BY a.timestamp DESC, a.id_auditoria DESC
      LIMIT ${limite}::int
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idAuditoria: linha.id_auditoria,
      idContribuicao: linha.id_contribuicao,
      idRepasse: linha.id_repasse,
      idEventoPagamento: linha.id_evento_pagamento,
      valor: Number(linha.valor),
      meioPagamento: linha.meio_pagamento,
      statusAnterior: linha.status_anterior,
      statusNovo: linha.status_novo,
      evento: linha.evento,
      idResponsavel: linha.id_usuario_responsavel,
      nomeResponsavel: linha.nome_responsavel,
      ocorridoEm: linha.ocorrido_em,
    }));
  }
}
