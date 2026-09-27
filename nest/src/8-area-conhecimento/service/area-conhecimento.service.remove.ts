import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { excluirComContagemDeUso } from '../../commons/database/excluir-com-contagem-de-uso.util';

// FK_CAMPANHA_AREA_CONHECIMENTO não tem CASCADE de propósito (ver area-conhecimento.module.ts): área em uso não
// se exclui, se desativa. O vínculo pai->filha (FK_AREA_CONHECIMENTO_PAI) é ON DELETE SET NULL e não bloqueia.
// pol_area_delete (04) exige area_conhecimento_gerenciar.
@Injectable()
export class AreaConhecimentoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idAreaConhecimento: number): Promise<void> {
    await excluirComContagemDeUso(this.database.getDb(), {
      tabela: 'area_conhecimento',
      coluna: 'id_area_conhecimento',
      id: idAreaConhecimento,
      item: { descricao: 'esta área de conhecimento', pronome: 'a' },
      mensagemNaoEncontrado: `Área de conhecimento ${idAreaConhecimento} não encontrada`,
      mensagemProibido: 'Sem permissão para excluir esta área de conhecimento.',
    });
  }
}
