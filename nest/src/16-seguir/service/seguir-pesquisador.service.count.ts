import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { SeguidoresPesquisadorResponse } from '../dto/response/seguir-pesquisador.response';

// Contagem de seguidores para a página pública do perfil (RF-028). contar_seguidores_pesquisador (03, [03-E]) é
// SECURITY DEFINER: devolve só o número, nunca quem segue.
@Injectable()
export class SeguirPesquisadorServiceCount {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idPesquisador: number,
  ): Promise<SeguidoresPesquisadorResponse> {
    const resultado = await sql<{ total: number }>`
      SELECT public.contar_seguidores_pesquisador(${idPesquisador}::int) AS total
    `.execute(this.database.getDb());
    return { idPesquisador, seguidores: resultado.rows[0]?.total ?? 0 };
  }
}
