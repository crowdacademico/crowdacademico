import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { SeguidoresCampanhaResponse } from '../dto/response/seguir-campanha.response';

// Quantas pessoas seguem a campanha (RF-010). contar_seguidores_campanha (03, [03-E]) é SECURITY DEFINER: devolve só
// o número, nunca quem segue.
@Injectable()
export class SeguirCampanhaServiceCount {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCampanha: number): Promise<SeguidoresCampanhaResponse> {
    const resultado = await sql<{ total: number }>`
      SELECT public.contar_seguidores_campanha(${idCampanha}::int) AS total
    `.execute(this.database.getDb());
    return { idCampanha, seguidores: resultado.rows[0]?.total ?? 0 };
  }
}
