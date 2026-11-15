import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { RecompensaGanhadorResponse } from '../dto/response/recompensa.response';

interface LinhaGanhador {
  id_contribuicao: number;
  apoiador: string;
  valor: string;
  ganha_em: Date;
  liberada: boolean;
}

// Quem ganhou uma recompensa (16-11-2026, Lucas e Alexia): para o dono da campanha saber a quem entregar, principalmente
// o reconhecimento. Só o nome (ou "Apoiador anônimo"); a regra e a autorização ficam no banco
// (listar_ganhadores_recompensa, 05; sem ser dono nem admin: 92043, que o filtro traduz para 403).
@Injectable()
export class RecompensaServiceWinners {
  constructor(private readonly database: DatabaseService) {}

  async executar(idRecompensa: number): Promise<RecompensaGanhadorResponse[]> {
    const resultado = await sql<LinhaGanhador>`
      SELECT * FROM public.listar_ganhadores_recompensa(${idRecompensa})
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idContribuicao: linha.id_contribuicao,
      apoiador: linha.apoiador,
      valor: Number(linha.valor),
      ganhaEm: linha.ganha_em,
      liberada: linha.liberada,
    }));
  }
}
