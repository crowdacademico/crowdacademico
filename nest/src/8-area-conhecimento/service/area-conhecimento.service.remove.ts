import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

const CODIGO_PG_FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class AreaConhecimentoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idAreaConhecimento: number): Promise<void> {
    const db = this.database.getDb();

    try {
      const resultado = await db
        .deleteFrom('area_conhecimento')
        .where('id_area_conhecimento', '=', idAreaConhecimento)
        .executeTakeFirst();

      if ((resultado?.numDeletedRows ?? 0n) === 0n) {
        // pol_area_delete (04): mesmo critério do update
        // (area_conhecimento_gerenciar).
        const existe = await db
          .selectFrom('area_conhecimento')
          .select('id_area_conhecimento')
          .where('id_area_conhecimento', '=', idAreaConhecimento)
          .executeTakeFirst();
        if (!existe) {
          throw new NotFoundException(
            `Área de conhecimento ${idAreaConhecimento} não encontrada`,
          );
        }
        throw new ForbiddenException(
          'Sem permissão para excluir esta área de conhecimento.',
        );
      }
    } catch (erro) {
      // FK_CAMPANHA_AREA_CONHECIMENTO e FK_AREA_CONHECIMENTO_PAI (esta
      // última só bloqueia se a área filha também estiver em uso — o
      // próprio vínculo pai->filho já é ON DELETE SET NULL, ver
      // 01_extensoes_enums_tabelas.sql) não têm CASCADE de propósito
      // (módulo criado sem endpoint de remoção justamente por isso — ver
      // comentário em area-conhecimento.module.ts). O filtro global
      // (postgres-exception.filter.ts) já traduz 23503 pra 400, mas com
      // uma mensagem genérica de INSERT ("registro relacionado não
      // existe") que não faz sentido pra um DELETE bloqueado — aqui vira
      // 409 com o motivo certo.
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
          'Não é possível excluir: esta área de conhecimento está em uso por campanhas ou por outra área filha. Desative-a em vez de excluir.',
        );
      }
      throw erro;
    }
  }
}
