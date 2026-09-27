import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CODIGO_PG_RLS_VIOLATION } from '../../commons/database/postgres-exception.filter';
import { UsuarioPapelRequestCreate } from '../dto/request/usuario-papel.request-create';
import { temCodigoPostgres } from '../../commons/database/codigo-postgres.util';

@Injectable()
export class UsuarioPapelServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: UsuarioPapelRequestCreate): Promise<void> {
    try {
      // pol_usuariopapel_insert (04) exige tem_permissao('papel_atribuir').
      await this.database
        .getDb()
        .insertInto('usuario_papel')
        .values({ id_usuario: dto.idUsuario, id_papel: dto.idPapel })
        .execute();
    } catch (erro) {
      // Papel já atribuído segue para o filtro global (mensagens-duplicidade.constants.ts).
      if (temCodigoPostgres(erro, CODIGO_PG_RLS_VIOLATION)) {
        throw new ForbiddenException(
          "Sem permissão 'papel_atribuir' para atribuir papéis.",
        );
      }
      throw erro;
    }
  }
}
