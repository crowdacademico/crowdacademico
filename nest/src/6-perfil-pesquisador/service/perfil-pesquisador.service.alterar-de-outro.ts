import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { PerfilPesquisadorRequestUpdate } from '../dto/request/perfil-pesquisador.request-update';

// alterar_perfil_pesquisador_de_outro() (03_funcoes_seguranca.sql, [03-U]): pol_perfil_update (04) só libera
// UPDATE de perfil_pesquisador ao PRÓPRIO dono (id_usuario = id_usuario_atual()), então um admin editando o
// vínculo/título de OUTRA pessoa via UPDATE direto sempre resultaria em 0 linhas: mesma classe de
// corrigir_cpf_pesquisador/criar_perfil_pesquisador_para_outro (acima, mesmo módulo), resolvida da mesma forma:
// função SECURITY DEFINER, gateada por permissão própria (perfil_pesquisador_alterar_de_outro), que ignora RLS
// de propósito.
@Injectable()
export class PerfilPesquisadorServiceAlterarDeOutro {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idUsuario: number,
    dto: PerfilPesquisadorRequestUpdate,
  ): Promise<void> {
    try {
      const resultado = await sql<{
        alterar_perfil_pesquisador_de_outro: boolean;
      }>`SELECT public.alterar_perfil_pesquisador_de_outro(${idUsuario}, ${dto.tipoVinculo}, ${dto.vinculoInstitucional ?? null}, ${dto.tituloAcademico})`.execute(
        this.database.getDb(),
      );
      if (resultado.rows[0]?.alterar_perfil_pesquisador_de_outro !== true) {
        throw new NotFoundException('Perfil de pesquisador não encontrado.');
      }
    } catch (erro) {
      if (erro instanceof NotFoundException) {
        throw erro;
      }
      // Mesma checagem de corrigir_cpf_pesquisador (acima) - a única
      // RAISE EXCEPTION dentro da função é a de permissão, sem ERRCODE
      // customizado (código P0001 padrão do Postgres).
      if ((erro as { code?: string }).code === 'P0001') {
        throw new ForbiddenException(
          (erro as Error).message ||
            'Sem permissão para alterar perfil de pesquisador de outro usuário.',
        );
      }
      throw erro;
    }
  }
}
