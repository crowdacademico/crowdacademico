import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

// Excluir (13-09-2026, pedido do Lucas: "para não sujar o banco" durante o
// desenvolvimento - Criar não ativa mais sozinho, ver TermoUsoServiceCriar,
// então um rascunho com muito erro de português pode simplesmente ser
// apagado em vez de corrigido).
//
// - `ativo = TRUE` bloqueia SEMPRE, sem exceção nem `forcar` (não dá pra
//   apagar a versão vigente - quebraria a garantia de "sempre existe 1
//   termo ativo por tipo" que Cadastro/Contribuição/Upgrade dependem pra
//   funcionar - isso não é sobre auditoria, é operacional).
// - Aceite em usuario_termo OU aceite_termo_contribuicao bloqueia por
//   padrão (409, mesma mensagem de antes), MAS aceita `forcar: true`
//   (13-09-2026, pedido do Lucas: "deveria aparecer... com um checkbox de
//   'entendi'... e o botão 'Excluir mesmo assim'") - o admin decide, ciente
//   de que isso apaga o rastro de quem aceitou. Com `forcar`, o DELETE
//   segue e o CASCADE das FKs (FK_USUARIO_TERMO_TERMO/FK_ACEITE_TERMO_
//   CONTRIBUICAO_TERMO, alteradas de RESTRICT pra CASCADE nesta mesma
//   rodada) apaga as linhas de aceite junto - não sobra rastro nenhum
//   dessas pessoas terem aceitado esta versão especificamente. A EXCLUSÃO
//   EM SI continua registrada em log_auditoria (trigger genérico da
//   tabela), então pelo menos "quem excluiu, quando" nunca se perde, só o
//   "quem tinha aceitado" é que desaparece.
@Injectable()
export class TermoUsoServiceExcluir {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number, forcar: boolean): Promise<void> {
    const termo = await this.database
      .getDb()
      .selectFrom('termos_de_uso')
      .select(['id_termo', 'ativo'])
      .where('id_termo', '=', id)
      .executeTakeFirst();

    if (!termo) {
      throw new NotFoundException('Versão de Termos de Uso não encontrada.');
    }

    if (termo.ativo) {
      throw new ConflictException(
        'Não é possível excluir a versão vigente - torne outra versão vigente primeiro, ou apenas altere esta.',
      );
    }

    if (!forcar) {
      const [aceiteGeral, aceiteContribuicao] = await Promise.all([
        this.database
          .getDb()
          .selectFrom('usuario_termo')
          .select('id_usuario_termo')
          .where('id_termo', '=', id)
          .executeTakeFirst(),
        this.database
          .getDb()
          .selectFrom('aceite_termo_contribuicao')
          .select('id_aceite_contrib')
          .where('id_termo', '=', id)
          .executeTakeFirst(),
      ]);

      if (aceiteGeral || aceiteContribuicao) {
        throw new ConflictException(
          'Esta versão já foi aceita por pelo menos uma pessoa - não pode mais ser excluída (rastro de auditoria).',
        );
      }
    }

    const resultado = await this.database
      .getDb()
      .deleteFrom('termos_de_uso')
      .where('id_termo', '=', id)
      .executeTakeFirst();

    if ((resultado?.numDeletedRows ?? 0n) === 0n) {
      // pol_termos_select é USING(true) - já confirmamos que a linha
      // existe acima, então 0 linhas apagadas só pode ser falta de
      // 'termos_uso_gerenciar' na pol_termos_delete.
      throw new ForbiddenException(
        "Sem permissão 'termos_uso_gerenciar' para excluir esta versão.",
      );
    }
  }
}
