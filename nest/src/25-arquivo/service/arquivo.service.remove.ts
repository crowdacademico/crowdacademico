import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class ArquivoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  // Soft delete (ativo=false), nunca DELETE de verdade — 06_grants.sql só
  // concede INSERT/UPDATE em `arquivo` (sem DELETE), e faz sentido: um
  // arquivo referenciado por arquivo_atualizacao/arquivo_recompensa/
  // usuario.id_imagem_perfil não pode simplesmente sumir do banco (FK
  // quebraria). "Remover" aqui é desativar; o objeto em si no bucket
  // continua existindo até uma limpeza manual decidir apagar de verdade.
  async executar(idArquivo: number): Promise<void> {
    const db = this.database.getDb();

    const linha = await db
      .updateTable('arquivo')
      .set({ ativo: false, desativado_em: new Date() })
      .where('id_arquivo', '=', idArquivo)
      .where('ativo', '=', true)
      .returning('id_arquivo')
      .executeTakeFirst();

    if (linha) {
      return;
    }

    // 0 linhas afetadas: três causas possíveis, só uma delas é erro de
    // verdade. SELECT é USING(TRUE) (pol_arquivo_select), então sempre
    // enxerga a linha se ela existir — usamos isso pra diferenciar.
    const atual = await db
      .selectFrom('arquivo')
      .select('ativo')
      .where('id_arquivo', '=', idArquivo)
      .executeTakeFirst();

    if (!atual) {
      throw new NotFoundException(`Arquivo ${idArquivo} não encontrado`);
    }
    if (!atual.ativo) {
      // Já estava inativo — idempotente, não é erro repetir a remoção.
      return;
    }
    // Existe e está ativo, mas o UPDATE não pegou: pol_arquivo_update (04)
    // bloqueou por falta de posse (dono do perfil/atualização/recompensa)
    // ou da permissão 'arquivo_gerenciar'.
    throw new ForbiddenException('Sem permissão para remover este arquivo.');
  }
}
