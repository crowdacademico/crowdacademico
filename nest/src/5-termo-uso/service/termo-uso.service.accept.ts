import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoServiceFindActive } from './termo-uso.service.find-active';

// RF-015: aceite da versão vigente do Termo de Uso por quem já tem conta. Só a versão vigente de 'cadastro':
// aceitar uma versão velha ou um rascunho não prova nada. O `id` vem da tela para garantir que a pessoa aceita
// exatamente o texto que leu; se a vigente mudou nesse meio tempo, 409 e a tela recarrega o texto novo.
// pol_usuario_termo_insert (04) só deixa gravar o próprio aceite. Aceitar de novo não é erro (ON CONFLICT).
@Injectable()
export class TermoUsoServiceAccept {
  constructor(
    private readonly database: DatabaseService,
    private readonly termoUsoServiceAtivo: TermoUsoServiceFindActive,
  ) {}

  async executar(
    idTermo: number,
    idUsuario: number,
    ip: string | undefined,
  ): Promise<void> {
    const vigente = await this.termoUsoServiceAtivo.executar('cadastro');
    if (vigente.idTermo !== idTermo) {
      throw new ConflictException(
        'Esta não é mais a versão vigente do Termo de Uso. Recarregue a página para ler a versão atual.',
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
