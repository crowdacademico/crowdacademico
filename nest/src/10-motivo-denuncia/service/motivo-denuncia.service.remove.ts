import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { CODIGO_PG_FOREIGN_KEY_VIOLATION } from '../../commons/database/postgres-exception.filter';

@Injectable()
export class MotivoDenunciaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idMotivo: number): Promise<void> {
    const db = this.database.getDb();

    try {
      const resultado = await db
        .deleteFrom('motivo_denuncia')
        .where('id_motivo', '=', idMotivo)
        .executeTakeFirst();

      // `resultado` nunca é undefined aqui - executeTakeFirst() de um
      // DELETE sempre resolve pro DeleteResult sintetizado pelo Kysely
      // (SimplifySingleResult devolve O puro pra Insert/Update/Delete/
      // MergeResult, nunca `| undefined`), então numDeletedRows também
      // nunca é undefined.
      if (resultado.numDeletedRows === 0n) {
        // pol_motivo_delete (04): mesmo critério do update
        // (motivo_denuncia_gerenciar).
        await distinguir404ou403(
          db,
          'motivo_denuncia',
          'id_motivo',
          idMotivo,
          `Motivo de denúncia ${idMotivo} não encontrado`,
          'Sem permissão para excluir este motivo de denúncia.',
        );
      }
    } catch (erro) {
      // FK_DENUNCIA_MOTIVO não tem CASCADE de propósito (módulo criado sem
      // endpoint de remoção justamente por isso - ver comentário em
      // motivo-denuncia.module.ts). Mesmo tratamento de
      // area-conhecimento.service.remove.ts: 23503 vira 409 com mensagem
      // própria em vez do 400 genérico do filtro global.
      if (
        erro instanceof NotFoundException ||
        erro instanceof ForbiddenException
      ) {
        throw erro;
      }
      // `erro` é `unknown` de verdade antes do `as` (cast, não prova) -
      // `?.` fica de propósito, mesmo o lint achando redundante depois do
      // cast.
      if (
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (erro as { code?: string })?.code === CODIGO_PG_FOREIGN_KEY_VIOLATION
      ) {
        throw new ConflictException(
          'Não é possível excluir: este motivo já foi usado em alguma denúncia. Desative-o em vez de excluir.',
        );
      }
      throw erro;
    }
  }
}
