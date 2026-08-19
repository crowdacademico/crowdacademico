import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../commons/database/database.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioRequestUpdate } from '../dto/request/usuario.request-update';
import { UsuarioResponse } from '../dto/response/usuario.response';

const CUSTO_BCRYPT = 10;

@Injectable()
export class UsuarioServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idUsuario: number,
    dto: UsuarioRequestUpdate,
  ): Promise<UsuarioResponse> {
    const db = this.database.getDb();

    // `senhaAtual` presente = troca autoatendida (Minha Conta > Segurança) —
    // exige conferir a senha de verdade antes de trocar (09-08-2026, Bloco
    // E). Ausente = reset administrativo (AlterarUsuario, painel admin),
    // comportamento de sempre, sem essa checagem.
    if (dto.senhaAtual !== undefined) {
      const atual = await db
        .selectFrom('usuario')
        .select('senha_hash')
        .where('id_usuario', '=', idUsuario)
        .executeTakeFirst();
      const confere =
        atual && (await bcrypt.compare(dto.senhaAtual, atual.senha_hash));
      if (!confere) {
        throw new UnauthorizedException('Senha atual incorreta.');
      }
    }

    const senhaHash = dto.novaSenha
      ? await bcrypt.hash(dto.novaSenha, CUSTO_BCRYPT)
      : undefined;

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
