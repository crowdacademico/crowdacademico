import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { CampanhaServiceFindOne } from './campanha.service.findone';
import { CampanhaResponse } from '../dto/response/campanha.response';

// Reagenda as datas de uma campanha em rascunho ou rejeitada mantendo a
// duração (ver REQUISITOS_V7, prazo vencido no envio). Tudo é decidido no
// banco: deslizar_datas_campanha() (05, [05-K-2]) confere que é o dono e o
// status, move data_inicio, data_fim E os marcos do cronograma numa
// instrução só, na ordem certa (a trigger do marco não dispara por escrita em
// campanha). Erros (não é o dono, campanha sem data de início, rejeitada sem
// reenvios) chegam já traduzidos pelo PostgresExceptionFilter, por isso não há
// try/catch aqui.
@Injectable()
export class CampanhaServiceDeslizarDatas {
  constructor(
    private readonly database: DatabaseService,
    private readonly findOne: CampanhaServiceFindOne,
  ) {}

  async executar(
    id: number,
    novaDataInicio: string,
  ): Promise<CampanhaResponse> {
    await sql`SELECT public.deslizar_datas_campanha(${id}, ${novaDataInicio}::timestamptz)`.execute(
      this.database.getDb(),
    );
    return this.findOne.executar(id);
  }
}
