import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { HistoricoRejeicaoResponse } from '../dto/response/historico-rejeicao.response';

// "Onde fica registrado" o motivo de uma campanha ter sido rejeitada, para Consultar Campanha: mesmo espírito
// de UsuarioServiceListarTermosAceitos (1-usuario): join simples para mostrar o nome do admin em vez do
// id_admin cru, mais recente primeiro (uma campanha pode ser rejeitada mais de uma vez: o pesquisador corrige e
// reenvia, ver o ciclo de rejeição e reenvio em REQUISITOS_V7).
//
// Filtra por `id_campanha` direto na tabela, sem JOIN com campanha, de propósito: o histórico sobrevive à
// exclusão da campanha (sem FK, ver 01), então esta listagem continua funcionando para uma campanha já apagada.
// O dono continua enxergando pelo `id_usuario_dono` gravado na linha (pol_historicorej_select, 04).
//
// `leftJoin` (não `innerJoin`) em `usuario`: `id_admin` já é nullable no schema, e mesmo quando preenchido,
// `pol_usuario_select` (RLS) esconde a linha se a conta do admin tiver sido excluída/anonimizada; o LEFT JOIN
// devolve `null` nesse caso, sem lógica extra aqui (mesmo comportamento já usado para dono de campanha
// excluído).
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
        'historico_rejeicao.id_usuario_dono',
        'historico_rejeicao.titulo_campanha',
        'usuario.nome as nome_admin',
        'historico_rejeicao.justificativa',
        'historico_rejeicao.rejeitado_em',
      ])
      .where('historico_rejeicao.id_campanha', '=', idCampanha)
      .orderBy('historico_rejeicao.rejeitado_em', 'desc')
      .execute();

    return linhas.map((linha) => ({
      idRejeicao: linha.id_rejeicao,
      idUsuarioDono: linha.id_usuario_dono,
      tituloCampanha: linha.titulo_campanha,
      nomeAdmin: linha.nome_admin,
      justificativa: linha.justificativa,
      rejeitadoEm: linha.rejeitado_em,
    }));
  }
}
