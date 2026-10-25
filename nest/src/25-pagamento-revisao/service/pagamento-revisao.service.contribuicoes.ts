import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { ContribuicaoAdminResponse } from '../dto/response/pagamento-revisao.response';

interface LinhaContribuicao {
  id_contribuicao: number;
  id_campanha: number;
  titulo_campanha: string;
  id_usuario: number | null;
  nome_apoiador: string | null;
  anonima: boolean;
  valor: string;
  meio_pagamento: string;
  status: string;
  criado_em: Date;
  id_repasse: number | null;
  status_repasse: string | null;
}

// Todas as contribuições, só leitura, a mais nova primeiro, com a situação do repasse em que cada uma entrou. A RLS
// (pol_contribuicao_select, 04) mostraria a quem não tem contribuicao_visualizar_sensivel só as próprias; a tela é de
// quem tem a permissão, então sem ela é 403, e não uma lista pela metade.
@Injectable()
export class PagamentoRevisaoServiceContribuicoes {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async listar(limite = 500): Promise<ContribuicaoAdminResponse[]> {
    await this.autorizacao.exigirPermissao(
      'contribuicao_visualizar_sensivel',
      'Você não tem permissão para ver as contribuições de outras pessoas.',
    );
    const resultado = await sql<LinhaContribuicao>`
      SELECT c.id_contribuicao, c.id_campanha, ca.titulo AS titulo_campanha, c.id_usuario, u.nome AS nome_apoiador,
             c.anonima, c.valor, c.meio_pagamento::text, c.status::text, c.criado_em, c.id_repasse,
             r.status::text AS status_repasse
      FROM contribuicao c
      JOIN campanha ca ON ca.id_campanha = c.id_campanha
      LEFT JOIN usuario u ON u.id_usuario = c.id_usuario
      LEFT JOIN repasse r ON r.id_repasse = c.id_repasse
      ORDER BY c.criado_em DESC, c.id_contribuicao DESC
      LIMIT ${limite}::int
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idContribuicao: linha.id_contribuicao,
      idCampanha: linha.id_campanha,
      tituloCampanha: linha.titulo_campanha,
      idApoiador: linha.id_usuario,
      nomeApoiador: linha.nome_apoiador,
      anonima: linha.anonima,
      valor: Number(linha.valor),
      meioPagamento: linha.meio_pagamento,
      status: linha.status,
      criadoEm: linha.criado_em,
      idRepasse: linha.id_repasse,
      statusRepasse: linha.status_repasse,
    }));
  }
}
