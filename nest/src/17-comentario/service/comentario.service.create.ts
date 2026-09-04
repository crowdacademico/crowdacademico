import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { COMENTARIO_COLUNAS_SELECT } from '../constants/comentario.constants';
import { ComentarioConverter } from '../dto/converter/comentario.converter';
import { ComentarioRequestCreate } from '../dto/request/comentario.request-create';
import { ComentarioResponse } from '../dto/response/comentario.response';

// validar_comentario_endosso (05, [05-K-3]) barra passar de
// configuracoes.limite_endossos_campanha - não checado aqui, só o CÁLCULO
// do próximo número (que precisa acontecer em algum lugar, a trigger não
// inventa esse valor sozinha, só valida a contagem). Race condition
// possível (duas pessoas endossando a mesma campanha ao mesmo tempo
// podem calcular o mesmo próximo número) - aceitável por ora, volume
// baixo; se virar problema real, a solução é mover esse cálculo pra
// dentro de uma trigger BEFORE INSERT no banco.
@Injectable()
export class ComentarioServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: ComentarioRequestCreate,
    idPesquisador: number,
  ): Promise<ComentarioResponse> {
    const db = this.database.getDb();
    const endossado = dto.endossado ?? false;

    const ordemEndosso = endossado
      ? await this.proximaOrdemEndosso(dto.idCampanha)
      : null;

    const linha = await db
      .insertInto('comentario')
      .values({
        id_campanha: dto.idCampanha,
        id_pesquisador: idPesquisador,
        conteudo: dto.conteudo,
        endossado,
        ordem_endosso: ordemEndosso,
      })
      .returning(COMENTARIO_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return ComentarioConverter.paraResponseDto(linha);
  }

  private async proximaOrdemEndosso(idCampanha: number): Promise<number> {
    const resultado = await this.database
      .getDb()
      .selectFrom('comentario')
      .select((eb) => eb.fn.max('ordem_endosso').as('maximo'))
      .where('id_campanha', '=', idCampanha)
      .where('ativo', '=', true)
      .executeTakeFirst();

    return (resultado?.maximo ?? 0) + 1;
  }
}
