import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioResponseDto } from '../dto/response/usuario.response.dto';
import { UsuarioEntity } from '../entity/usuario.entity';

@Injectable()
export class UsuarioServiceFindAll {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async executar(): Promise<UsuarioResponseDto[]> {
    // pol_usuario_select (04_rls_policies.sql) libera `deletado = FALSE`
    // pra qualquer sessão, mesmo sem login — por isso funciona já nesta
    // primeira versão, sem esperar o módulo 23-auth existir.
    const resultado = await this.pool.query<UsuarioEntity>(
      `SELECT ${USUARIO_COLUNAS_SELECT} FROM usuario WHERE deletado = FALSE ORDER BY nome`,
    );
    return resultado.rows.map((linha) =>
      UsuarioConverter.paraResponseDto(linha),
    );
  }
}
