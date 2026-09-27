import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { excluirComContagemDeUso } from '../../commons/database/excluir-com-contagem-de-uso.util';

// FK_LINK_ACADEMICO_TIPOLINK / FK_LINK_ATUALIZACAO_TIPOLINK / FK_LINK_RECOMPENSA_TIPOLINK não têm CASCADE de
// propósito (ver tipo-link.module.ts): tipo em uso não se exclui, se desativa. pol_tipolink_delete (04) exige
// tipolink_gerenciar.
@Injectable()
export class TipoLinkServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idTipolink: number): Promise<void> {
    await excluirComContagemDeUso(this.database.getDb(), {
      tabela: 'tipo_link',
      coluna: 'id_tipolink',
      id: idTipolink,
      item: { descricao: 'este tipo de link', pronome: 'o' },
      mensagemNaoEncontrado: `Tipo de link ${idTipolink} não encontrado`,
      mensagemProibido: 'Sem permissão para excluir este tipo de link.',
    });
  }
}
