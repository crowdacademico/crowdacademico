import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { AtualizarUsuarioRequestDto } from '../dto/request/atualizar-usuario.request.dto';
import { UsuarioResponseDto } from '../dto/response/usuario.response.dto';
import { UsuarioEntity } from '../entity/usuario.entity';

const CUSTO_BCRYPT = 10;

@Injectable()
export class UsuarioServiceUpdate {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async executar(
    idUsuario: number,
    dto: AtualizarUsuarioRequestDto,
  ): Promise<UsuarioResponseDto> {
    const senhaHash = dto.novaSenha
      ? await bcrypt.hash(dto.novaSenha, CUSTO_BCRYPT)
      : null;

    const resultado = await this.pool.query<UsuarioEntity>(
      `UPDATE usuario
       SET nome             = COALESCE($2, nome),
           id_imagem_perfil = COALESCE($3, id_imagem_perfil),
           senha_hash       = COALESCE($4, senha_hash)
       WHERE id_usuario = $1
       RETURNING ${USUARIO_COLUNAS_SELECT}`,
      [idUsuario, dto.nome ?? null, dto.idImagemPerfil ?? null, senhaHash],
    );

    if (resultado.rowCount === 0) {
      // OBSERVAÇÃO (vai mudar assim que o módulo 23-auth existir): sem
      // SET LOCAL app.id_usuario_atual definido na sessão, pol_usuario_update
      // (04_rls_policies.sql) nunca casa `id_usuario = id_usuario_atual()` —
      // a RLS filtra a linha ANTES do UPDATE, e o Postgres devolve "0 linhas
      // afetadas" sem erro nenhum. Por enquanto, qualquer tentativa de editar
      // um usuário aqui vai cair neste branch — é esperado, não é bug deste
      // service. Assim que existir sessão de verdade, isso passa a funcionar
      // pro dono da conta (ou pra quem tiver usuario_suspender).
      const existe = await this.pool.query(
        'SELECT 1 FROM usuario WHERE id_usuario = $1 AND deletado = FALSE',
        [idUsuario],
      );
      if (existe.rowCount === 0) {
        throw new NotFoundException(`Usuário ${idUsuario} não encontrado`);
      }
      throw new ForbiddenException(
        'Sem sessão autenticada ainda (módulo 23-auth) — RLS bloqueou o UPDATE.',
      );
    }

    return UsuarioConverter.paraResponseDto(resultado.rows[0]);
  }
}
