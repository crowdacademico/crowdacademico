import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioResponseDto } from '../dto/response/usuario.response.dto';

@Injectable()
export class UsuarioServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<UsuarioResponseDto[]> {
    // pol_usuario_select (04_rls_policies.sql) libera `deletado = FALSE`
    // pra qualquer sessão, mesmo sem login — por isso funciona pra anônimo.
    const usuarios = await this.database
      .getDb()
      .selectFrom('usuario')
      .select(USUARIO_COLUNAS_SELECT)
      .where('deletado', '=', false)
      .orderBy('nome')
      .execute();

    return usuarios.map((linha) => UsuarioConverter.paraResponseDto(linha));
  }
}
