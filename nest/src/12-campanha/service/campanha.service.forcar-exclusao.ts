import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

// forcar_exclusao_campanha() (03_funcoes_seguranca.sql, [03-T]): o Admin precisa poder excluir forçadamente uma
// campanha (senão o Campo de Testes fica sujo). Diferente de CampanhaServiceRemove (DELETE /campanha/:id), que
// só funciona em 'rascunho' (pol_campanha_delete, 04: proteção correta para campanha real, com
// contribuição/repasse em andamento), esta função ignora status de propósito, gateada por permissão própria
// (campanha_excluir_forcado, nunca campanha_editar). É só ferramenta de bancada: nunca exposta no painel real.
@Injectable()
export class CampanhaServiceForcarExclusao {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    let excluiu: boolean;
    try {
      const resultado = await sql<{ forcar_exclusao_campanha: boolean }>`
        SELECT public.forcar_exclusao_campanha(${id})
      `.execute(this.database.getDb());
      excluiu = resultado.rows[0].forcar_exclusao_campanha;
    } catch (erro) {
      // Única RAISE EXCEPTION da função é a checagem de permissão (sem
      // ERRCODE customizado, P0001).
      if ((erro as { code?: string }).code === 'P0001') {
        throw new ForbiddenException((erro as Error).message);
      }
      throw erro;
    }

    if (!excluiu) {
      throw new NotFoundException('Campanha não encontrada.');
    }
  }
}
