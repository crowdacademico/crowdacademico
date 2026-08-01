import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../commons/database/database.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { AtualizarUsuarioRequestDto } from '../dto/request/atualizar-usuario.request.dto';
import { UsuarioResponseDto } from '../dto/response/usuario.response.dto';

const CUSTO_BCRYPT = 10;

@Injectable()
export class UsuarioServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idUsuario: number,
    dto: AtualizarUsuarioRequestDto,
  ): Promise<UsuarioResponseDto> {
    const senhaHash = dto.novaSenha
      ? await bcrypt.hash(dto.novaSenha, CUSTO_BCRYPT)
      : undefined;
    const db = this.database.getDb();

    const campos = {
      ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
      ...(dto.idImagemPerfil !== undefined
        ? { id_imagem_perfil: dto.idImagemPerfil }
        : {}),
      ...(senhaHash !== undefined ? { senha_hash: senhaHash } : {}),
    };
    if (Object.keys(campos).length === 0) {
      // `UPDATE usuario SET WHERE ...` sem coluna nenhuma é SQL inválido —
      // melhor um 400 claro do que deixar o Postgres estourar um erro de
      // sintaxe genérico.
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const usuario = await db
      .updateTable('usuario')
      .set(campos)
      .where('id_usuario', '=', idUsuario)
      .returning(USUARIO_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!usuario) {
      // pol_usuario_update (04_rls_policies.sql) exige id_usuario_atual() =
      // id_usuario (dono) OU permissão 'usuario_suspender'. Controller já
      // aplica RequireAuthGuard (3-auth), então chegar aqui sem afetar
      // linha nenhuma só acontece pra quem está logado mas não é dono nem
      // tem a permissão — RLS bloqueou o UPDATE (0 linhas, sem erro do
      // Postgres). Diferencia de "não existe" checando a existência à parte.
      const existe = await db
        .selectFrom('usuario')
        .select('id_usuario')
        .where('id_usuario', '=', idUsuario)
        .where('deletado', '=', false)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException(`Usuário ${idUsuario} não encontrado`);
      }
      throw new ForbiddenException('Sem permissão para editar este usuário.');
    }

    return UsuarioConverter.paraResponseDto(usuario);
  }
}
