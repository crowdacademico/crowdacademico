import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

const CODIGO_PG_FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class TipoLinkServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idTipolink: number): Promise<void> {
    const db = this.database.getDb();

    try {
      const resultado = await db
        .deleteFrom('tipo_link')
        .where('id_tipolink', '=', idTipolink)
        .executeTakeFirst();

      if ((resultado?.numDeletedRows ?? 0n) === 0n) {
        // pol_tipolink_delete (04): mesmo critério do update
        // (tipolink_gerenciar).
        const existe = await db
          .selectFrom('tipo_link')
          .select('id_tipolink')
          .where('id_tipolink', '=', idTipolink)
          .executeTakeFirst();
        if (!existe) {
          throw new NotFoundException(
            `Tipo de link ${idTipolink} não encontrado`,
          );
        }
        throw new ForbiddenException(
          'Sem permissão para excluir este tipo de link.',
        );
      }
    } catch (erro) {
      // FK_LINK_ACADEMICO_TIPOLINK / FK_LINK_ATUALIZACAO_TIPOLINK /
      // FK_LINK_RECOMPENSA_TIPOLINK não têm CASCADE de propósito (módulo
      // criado sem endpoint de remoção justamente por isso — ver
      // comentário em tipo-link.module.ts). Mesmo tratamento de
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
          'Não é possível excluir: este tipo de link está em uso em perfis, atualizações ou recompensas. Desative-o em vez de excluir.',
        );
      }
      throw erro;
    }
  }
}
