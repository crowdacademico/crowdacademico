import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

// Excluir: como Criar não ativa mais sozinho (ver TermoUsoServiceCriar), um rascunho com muito erro de
// português pode simplesmente ser apagado em vez de corrigido, sem sujar o banco.
//
// - `ativo = TRUE` bloqueia SEMPRE, sem exceção nem `forcar` (não dá para apagar a versão vigente: quebraria a
// garantia de "sempre existe 1 termo ativo por tipo" de que Cadastro/Contribuição/Upgrade dependem; isso não é
// sobre auditoria, é operacional).
// - Aceite em usuario_termo OU aceite_termo_contribuicao bloqueia por padrão (409), MAS aceita `forcar: true`
// (checkbox de "entendi" e botão "Excluir mesmo assim"): o admin decide, ciente de que isso apaga o rastro de
// quem aceitou. Com `forcar`, o DELETE segue e o CASCADE das FKs
// (FK_USUARIO_TERMO_TERMO/FK_ACEITE_TERMO_CONTRIBUICAO_TERMO) apaga as linhas de aceite junto: não sobra rastro
// nenhum dessas pessoas terem aceitado esta versão especificamente. A EXCLUSÃO EM SI continua registrada em
// log_auditoria (trigger genérico da tabela), então "quem excluiu, quando" nunca se perde, só o "quem tinha
// aceitado" desaparece.
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
