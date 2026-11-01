import type { ModeloMensagemEntity } from '../../../commons/database/db.types';
import { camposDoTipo } from '../../constants/notificacao.constants';
import { ModeloMensagemResponse } from '../response/modelo-mensagem.response';

export class ModeloMensagemConverter {
  static paraResponseDto(entity: ModeloMensagemEntity): ModeloMensagemResponse {
    return {
      idModeloMensagem: entity.id_modelo_mensagem,
      tipoEvento: entity.tipo_evento,
      canal: entity.canal,
      titulo: entity.titulo,
      corpo: entity.corpo,
      ativo: entity.ativo,
      obrigatoria: entity.obrigatoria,
      atualizadoEm: entity.atualizado_em,
      campos: camposDoTipo(entity.tipo_evento),
    };
  }
}
