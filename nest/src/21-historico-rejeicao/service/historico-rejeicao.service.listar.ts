import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { HistoricoRejeicaoResponse } from '../dto/response/historico-rejeicao.response';

// "Onde fica registrado" o motivo de uma campanha ter sido rejeitada,
// pedido do Lucas (14-09-2026) pra Consultar Campanha - mesmo espírito de
// UsuarioServiceListarTermosAceitos (1-usuario): join simples pra mostrar
// nome do admin em vez do id_admin cru, mais recente primeiro (uma
// campanha pode ser rejeitada mais de uma vez - RF-070 permite reenviar
// depois de corrigir).
//
// `leftJoin` (não `innerJoin`) em `usuario`: `id_admin` já é nullable no
// schema, e mesmo quando preenchido, `pol_usuario_select` (RLS) esconde a
// linha se a conta do admin tiver sido excluída/anonimizada - o LEFT JOIN
// simplesmente devolve `null` nesse caso, sem precisar de nenhuma lógica
// extra aqui (mesmo comportamento já usado pra dono de campanha excluído,
// ver PENDENCIAS e correcoes.md, item 17).
@Injectable()
export class HistoricoRejeicaoServiceListar {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCampanha: number): Promise<HistoricoRejeicaoResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('historico_rejeicao')
      .leftJoin('usuario', 'usuario.id_usuario', 'historico_rejeicao.id_admin')
      .select([
        'historico_rejeicao.id_rejeicao',
        'usuario.nome as nome_admin',
        'historico_rejeicao.justificativa',
        'historico_rejeicao.rejeitado_em',
      ])
      .where('historico_rejeicao.id_campanha', '=', idCampanha)
      .orderBy('historico_rejeicao.rejeitado_em', 'desc')
      .execute();

    return linhas.map((linha) => ({
      idRejeicao: linha.id_rejeicao,
      nomeAdmin: linha.nome_admin,
      justificativa: linha.justificativa,
      rejeitadoEm: linha.rejeitado_em,
    }));
  }
}
