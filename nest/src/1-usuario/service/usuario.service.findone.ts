import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioResponseDto } from '../dto/response/usuario.response.dto';

@Injectable()
export class UsuarioServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<UsuarioResponseDto> {
    const usuario = await this.database
      .getDb()
      .selectFrom('usuario')
      .select(USUARIO_COLUNAS_SELECT)
      .where('id_usuario', '=', idUsuario)
      .where('deletado', '=', false)
      .executeTakeFirst();

    if (!usuario) {
      throw new NotFoundException(`Usuário ${idUsuario} não encontrado`);
    }

    return UsuarioConverter.paraResponseDto(usuario);
  }
}
