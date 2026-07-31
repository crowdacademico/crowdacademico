import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioResponseDto } from '../dto/response/usuario.response.dto';
import { UsuarioEntity } from '../entity/usuario.entity';

@Injectable()
export class UsuarioServiceFindOne {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async executar(idUsuario: number): Promise<UsuarioResponseDto> {
    const resultado = await this.pool.query<UsuarioEntity>(
      `SELECT ${USUARIO_COLUNAS_SELECT} FROM usuario WHERE id_usuario = $1 AND deletado = FALSE`,
      [idUsuario],
    );

    if (resultado.rows.length === 0) {
      throw new NotFoundException(`Usuário ${idUsuario} não encontrado`);
    }

    return UsuarioConverter.paraResponseDto(resultado.rows[0]);
  }
}
