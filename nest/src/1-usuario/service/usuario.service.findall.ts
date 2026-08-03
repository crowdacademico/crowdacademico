import { Injectable } from '@nestjs/common';
import {
  ParametrosPaginacao,
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { DatabaseService } from '../../commons/database/database.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioResponseDto } from '../dto/response/usuario.response.dto';

@Injectable()
export class UsuarioServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    paginacao?: ParametrosPaginacao,
  ): Promise<ResultadoPaginado<UsuarioResponseDto>> {
    // pol_usuario_select (04_rls_policies.sql) libera `deletado = FALSE`
    // pra qualquer sessão, mesmo sem login — por isso funciona pra anônimo.
    const query = this.database
      .getDb()
      .selectFrom('usuario')
      .select(USUARIO_COLUNAS_SELECT)
      .where('deletado', '=', false)
      .orderBy('nome');

    const resultado = await paginar(query, paginacao);
    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        UsuarioConverter.paraResponseDto(linha),
      ),
    };
  }
}
