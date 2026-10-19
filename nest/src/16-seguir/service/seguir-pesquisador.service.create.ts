import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { SeguirPesquisadorConverter } from '../dto/converter/seguir-pesquisador.converter';
import { SeguirPesquisadorRequestCreate } from '../dto/request/seguir-pesquisador.request-create';
import { SeguirPesquisadorResponse } from '../dto/response/seguir-pesquisador.response';

// RF-028. O banco barra seguir duas vezes (UK_SEGUIR_PESQUISADOR_USUARIO_PESQUISADOR, 23505) e seguir a si mesmo
// (CK_SEGUIR_PESQUISADOR_NAO_AUTOSEGUIR, 23514), traduzidos pelo PostgresExceptionFilter. Aqui só a regra que o banco
// não tem: o alvo precisa ser um pesquisador (ter perfil), não qualquer conta.
@Injectable()
export class SeguirPesquisadorServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: SeguirPesquisadorRequestCreate,
    idUsuario: number,
  ): Promise<SeguirPesquisadorResponse> {
    const db = this.database.getDb();
    const pesquisador = await db
      .selectFrom('perfil_pesquisador')
      .innerJoin(
        'usuario',
        'usuario.id_usuario',
        'perfil_pesquisador.id_usuario',
      )
      .select(['usuario.nome'])
      .where('perfil_pesquisador.id_usuario', '=', dto.idPesquisador)
      .executeTakeFirst();
    if (!pesquisador) {
      throw new BadRequestException('Esta conta não é de um pesquisador.');
    }

    const linha = await db
      .insertInto('seguir_pesquisador')
      .values({ id_usuario: idUsuario, id_pesquisador: dto.idPesquisador })
      .returning([
        'id_seg_pesquisador',
        'id_usuario',
        'id_pesquisador',
        'seguido_em',
      ])
      .executeTakeFirstOrThrow();

    return SeguirPesquisadorConverter.paraResponseDto({
      ...linha,
      nome_pesquisador: pesquisador.nome,
    });
  }
}
