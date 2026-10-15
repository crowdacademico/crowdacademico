import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

// DELETE /conta-recebimento: apaga a chave Pix do próprio perfil. O repasse pendente volta a esperar uma chave nova
// (listar_repasses_atencao mostra "aguardando conta"); o que já foi transferido não muda.
@Injectable()
export class ContaRecebimentoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .updateTable('perfil_pesquisador')
      .set({
        tipo_chave_pix: null,
        chave_pix_criptografada: null,
        chave_pix_verificada_em: null,
      })
      .where('id_usuario', '=', idUsuario)
      .where('chave_pix_criptografada', 'is not', null)
      .executeTakeFirst();
    if (resultado.numUpdatedRows === 0n) {
      throw new NotFoundException('Nenhuma chave Pix cadastrada.');
    }
  }
}
