import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

// Excluir: como Criar não ativa mais sozinho (ver TermoUsoServiceCreate), um rascunho com muito erro de
// português pode simplesmente ser apagado em vez de corrigido, sem sujar o banco.
//
// - `ativo = TRUE` bloqueia sempre (não dá para apagar a versão vigente: quebraria a garantia de "sempre existe 1
// termo vigente por tipo" de que Cadastro/Contribuição/Upgrade dependem).
// - Versão já aceita (cadastro, upgrade ou contribuição) não pode ser excluída, RF-091: quem recusa é o banco
// (fn_protege_termo_aceito, 91032 -> 409), porque o aceite é a prova do que a pessoa aceitou.
@Injectable()
export class TermoUsoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    const termo = await this.database
      .getDb()
      .selectFrom('termos_de_uso')
      .select(['id_termo', 'ativo'])
      .where('id_termo', '=', id)
      .executeTakeFirst();

    if (!termo) {
      throw new NotFoundException('Versão do Termo de Uso não encontrada.');
    }

    if (termo.ativo) {
      throw new ConflictException(
        'Não é possível excluir a versão vigente - torne outra versão vigente primeiro, ou apenas altere esta.',
      );
    }

    const resultado = await this.database
      .getDb()
      .deleteFrom('termos_de_uso')
      .where('id_termo', '=', id)
      .executeTakeFirst();

    // `resultado` nunca é undefined - mesmo motivo de
    // motivo-denuncia.service.remove.ts (executeTakeFirst() de DELETE
    // sempre resolve pro DeleteResult sintetizado pelo Kysely).
    if (resultado.numDeletedRows === 0n) {
      // pol_termos_select é USING(true) - já confirmamos que a linha
      // existe acima, então 0 linhas apagadas só pode ser falta de
      // 'termos_uso_gerenciar' na pol_termos_delete.
      throw new ForbiddenException(
        "Sem permissão 'termos_uso_gerenciar' para excluir esta versão.",
      );
    }
  }
}
