import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { AtribuirPapelRequestDto } from '../dto/request/atribuir-papel.request.dto';

const CODIGO_PG_UNIQUE_VIOLATION = '23505';
const CODIGO_PG_RLS_VIOLATION = '42501';

@Injectable()
export class UsuarioPapelServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: AtribuirPapelRequestDto): Promise<void> {
    try {
      // pol_usuariopapel_insert (04) exige tem_permissao('papel_atribuir').
      await this.database
        .getDb()
        .insertInto('usuario_papel')
        .values({ id_usuario: dto.idUsuario, id_papel: dto.idPapel })
        .execute();
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo === CODIGO_PG_UNIQUE_VIOLATION) {
        throw new ConflictException('Este usuário já tem este papel.');
      }
      if (codigo === CODIGO_PG_RLS_VIOLATION) {
        throw new ForbiddenException(
          "Sem permissão 'papel_atribuir' para atribuir papéis.",
        );
      }
      throw erro;
    }
  }
}
