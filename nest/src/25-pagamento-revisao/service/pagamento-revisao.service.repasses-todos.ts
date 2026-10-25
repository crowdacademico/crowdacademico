import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { RepasseAdminResponse } from '../dto/response/pagamento-revisao.response';

interface LinhaRepasse {
  id_repasse: number;
  id_campanha: number;
  titulo_campanha: string;
  valor_bruto: string;
  valor_liquido: string;
  meta_atingida: boolean;
  status: string;
  aguardando_conta: boolean;
  criado_em: Date;
  repassado_em: Date | null;
}

// Todos os repasses, só leitura, o mais novo primeiro. "Aguardando chave Pix" com a mesma regra de
// listar_repasses_atencao (05): o dono da campanha sem chave Pix verificada. A RLS (pol_repasse_select, 04) mostraria a
// quem não tem repasse_aprovar só os repasses das próprias campanhas; a tela é de quem tem a permissão, então sem ela é
// 403, e não uma lista pela metade.
@Injectable()
export class PagamentoRevisaoServiceRepassesTodos {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async listar(limite = 500): Promise<RepasseAdminResponse[]> {
    await this.autorizacao.exigirPermissao(
      'repasse_aprovar',
      'Você não tem permissão para ver os repasses.',
    );
    const resultado = await sql<LinhaRepasse>`
      SELECT r.id_repasse, r.id_campanha, ca.titulo AS titulo_campanha, r.valor_bruto, r.valor_liquido, r.meta_atingida,
             r.status::text, r.criado_em, r.repassado_em,
             NOT EXISTS (
                 SELECT 1 FROM perfil_pesquisador pp
                 WHERE pp.id_usuario = ca.id_usuario AND pp.chave_pix_verificada_em IS NOT NULL
             ) AS aguardando_conta
      FROM repasse r
      JOIN campanha ca ON ca.id_campanha = r.id_campanha
      ORDER BY r.criado_em DESC, r.id_repasse DESC
      LIMIT ${limite}::int
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idRepasse: linha.id_repasse,
      idCampanha: linha.id_campanha,
      tituloCampanha: linha.titulo_campanha,
      valorBruto: Number(linha.valor_bruto),
      valorLiquido: Number(linha.valor_liquido),
      metaAtingida: linha.meta_atingida,
      status: linha.status,
      aguardandoConta: linha.aguardando_conta,
      criadoEm: linha.criado_em,
      repassadoEm: linha.repassado_em,
    }));
  }
}
