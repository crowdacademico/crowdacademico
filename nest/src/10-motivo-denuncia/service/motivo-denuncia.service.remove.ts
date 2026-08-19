import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

const CODIGO_PG_FOREIGN_KEY_VIOLATION = '23503';

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

      if ((resultado?.numDeletedRows ?? 0n) === 0n) {
        // pol_motivo_delete (04): mesmo critério do update
        // (motivo_denuncia_gerenciar).
        const existe = await db
          .selectFrom('motivo_denuncia')
          .select('id_motivo')
          .where('id_motivo', '=', idMotivo)
          .executeTakeFirst();
        if (!existe) {
          throw new NotFoundException(
            `Motivo de denúncia ${idMotivo} não encontrado`,
          );
        }
        throw new ForbiddenException(
          'Sem permissão para excluir este motivo de denúncia.',
        );
      }
    } catch (erro) {
      // FK_DENUNCIA_MOTIVO não tem CASCADE de propósito (módulo criado sem
      // endpoint de remoção justamente por isso — ver comentário em
      // motivo-denuncia.module.ts). Mesmo tratamento de
      // area-conhecimento.service.remove.ts: 23503 vira 409 com mensagem
      // própria em vez do 400 genérico do filtro global.
      if (
        erro instanceof NotFoundException ||
        erro instanceof ForbiddenException
      ) {
        throw erro;
      }
      if (
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
