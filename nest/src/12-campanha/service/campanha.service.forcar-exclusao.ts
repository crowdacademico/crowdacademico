import { Injectable, NotFoundException } from '@nestjs/common';
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
    const resultado = await sql<{ forcar_exclusao_campanha: boolean }>`
      SELECT public.forcar_exclusao_campanha(${id})
    `.execute(this.database.getDb());
    if (!resultado.rows[0].forcar_exclusao_campanha) {
      throw new NotFoundException('Campanha não encontrada.');
    }
  }
}
