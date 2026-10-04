import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoServiceFindPending } from './termo-uso.service.find-pending';

// RF-015: aceite da versão vigente de um termo por quem já tem conta (o da conta ou, para pesquisador, o de
// pesquisador). Só a versão que está pendente para esta conta: aceitar uma versão velha ou um rascunho não prova
// nada. O `id` vem da tela para garantir que a pessoa aceita exatamente o texto que leu; se a vigente mudou nesse
// meio tempo, 409 e a tela recarrega o texto novo. pol_usuario_termo_insert (04) só deixa gravar o próprio aceite.
// Sem nada pendente, não é erro (aceitar de novo).
@Injectable()
export class TermoUsoServiceAccept {
  constructor(
    private readonly database: DatabaseService,
    private readonly termoPendente: TermoUsoServiceFindPending,
  ) {}

  async executar(
    idTermo: number,
    idUsuario: number,
    ip: string | undefined,
  ): Promise<void> {
    const pendente = await this.termoPendente.idPendente(idUsuario);
    if (pendente === null) return;
    if (pendente !== idTermo) {
      throw new ConflictException(
        'Esta não é mais a versão vigente do termo. Recarregue a página para ler a versão atual.',
      );
    }

    await this.database
      .getDb()
      .insertInto('usuario_termo')
      .values({
        id_usuario: idUsuario,
        id_termo: idTermo,
        ip_aceite: ip ?? null,
      })
      .onConflict((oc) => oc.columns(['id_usuario', 'id_termo']).doNothing())
      .execute();
  }
}
