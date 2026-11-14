import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { ContribuicaoResponsePublicCount } from '../dto/response/contribuicao.response-public-count';

@Injectable()
export class ContribuicaoServicePublicCount {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCampanha: number): Promise<ContribuicaoResponsePublicCount> {
    const resultado = await sql<{ pagas: number }>`
      SELECT public.contar_apoios_publicos_campanha(${idCampanha}) AS pagas
    `.execute(this.database.getDb());
    const linha = resultado.rows[0];
    return { pagas: Number(linha.pagas) };
  }
}
