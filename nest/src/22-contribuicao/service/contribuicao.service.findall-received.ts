import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import type {
  MeioPagamento,
  StatusContribuicao,
} from '../../commons/database/db.types';
import { ContribuicaoResponseReceived } from '../dto/response/contribuicao.response-received';

interface LinhaContribuicaoRecebida {
  id_contribuicao: number;
  id_campanha: number;
  titulo_campanha: string;
  apoiador: string;
  valor: string;
  meio_pagamento: MeioPagamento;
  status: StatusContribuicao;
  criado_em: Date;
  recompensas: string | null;
}

@Injectable()
export class ContribuicaoServiceFindAllReceived {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<ContribuicaoResponseReceived[]> {
    const resultado = await sql<LinhaContribuicaoRecebida>`
      SELECT * FROM public.contribuicoes_recebidas_pesquisador()
    `.execute(this.database.getDb());

    return resultado.rows.map((linha) => ({
      idContribuicao: linha.id_contribuicao,
      idCampanha: linha.id_campanha,
      tituloCampanha: linha.titulo_campanha,
      apoiador: linha.apoiador,
      valor: Number(linha.valor),
      meioPagamento: linha.meio_pagamento,
      status: linha.status,
      criadoEm: linha.criado_em,
      recompensas: linha.recompensas,
    }));
  }
}
