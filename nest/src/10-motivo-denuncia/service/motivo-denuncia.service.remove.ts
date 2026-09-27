import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { excluirComContagemDeUso } from '../../commons/database/excluir-com-contagem-de-uso.util';

// FK_DENUNCIA_MOTIVO não tem CASCADE de propósito (ver motivo-denuncia.module.ts): motivo já usado em denúncia
// não se exclui, se desativa. pol_motivo_delete (04) exige motivo_denuncia_gerenciar.
@Injectable()
export class MotivoDenunciaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idMotivo: number): Promise<void> {
    await excluirComContagemDeUso(this.database.getDb(), {
      tabela: 'motivo_denuncia',
      coluna: 'id_motivo',
      id: idMotivo,
      item: { descricao: 'este motivo', pronome: 'o' },
      mensagemNaoEncontrado: `Motivo de denúncia ${idMotivo} não encontrado`,
      mensagemProibido: 'Sem permissão para excluir este motivo de denúncia.',
    });
  }
}
