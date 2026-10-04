import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoResponseActive } from '../dto/response/termo-uso.response-active';

// RF-015: o termo que a tela de aceite mostra, decidido pelo banco (fn_termo_uso_pendente, 03): o da conta primeiro
// e, para quem é pesquisador, o de pesquisador. Um por vez: aceitar renova a sessão, e se ainda houver outro, a
// tela mostra o próximo.
@Injectable()
export class TermoUsoServiceFindPending {
  constructor(private readonly database: DatabaseService) {}

  async idPendente(idUsuario: number): Promise<number | null> {
    const resultado = await sql<{
      id_termo: number | null;
    }>`SELECT public.fn_termo_uso_pendente(${idUsuario}) AS id_termo`.execute(
      this.database.getDb(),
    );
    return resultado.rows[0]?.id_termo ?? null;
  }

  async executar(idUsuario: number): Promise<TermoUsoResponseActive> {
    const idTermo = await this.idPendente(idUsuario);
    const termo =
      idTermo === null
        ? undefined
        : await this.database
            .getDb()
            .selectFrom('termos_de_uso')
            .select(['id_termo', 'tipo', 'versao', 'conteudo'])
            .where('id_termo', '=', idTermo)
            .executeTakeFirst();
    if (!termo) {
      throw new NotFoundException('Nenhum termo esperando aceite.');
    }
    return {
      idTermo: termo.id_termo,
      tipo: termo.tipo,
      versao: termo.versao,
      conteudo: termo.conteudo,
    };
  }
}
