import { Injectable } from '@nestjs/common';
import {
  ParametrosPaginacao,
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioResponse } from '../dto/response/usuario.response';

@Injectable()
export class UsuarioServiceFindAll {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async executar(
    paginacao?: ParametrosPaginacao,
  ): Promise<ResultadoPaginado<UsuarioResponse>> {
    // pol_usuario_select (04_rls_policies.sql) libera `deletado = FALSE` pra qualquer sessão (o login precisa achar
    // o usuário antes de existir alguém autenticado), então quem decide aqui é a permissão, não a RLS.
    await this.autorizacao.exigirPermissao(
      'usuario_visualizar_sensivel',
      'Você não tem permissão para listar os usuários.',
    );
    const query = this.database
      .getDb()
      .selectFrom('usuario')
      .select(USUARIO_COLUNAS_SELECT)
      .where('deletado', '=', false)
      .orderBy('id_usuario');

    const resultado = await paginar(query, paginacao);
    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        UsuarioConverter.paraResponseDto(linha),
      ),
    };
  }
}
