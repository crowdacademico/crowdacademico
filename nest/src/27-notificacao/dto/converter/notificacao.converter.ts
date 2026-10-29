import type { NotificacaoEntity } from '../../../commons/database/db.types';
import { CHAVE_SEGREDO_NOTIFICACAO } from '../../constants/notificacao.constants';
import { NotificacaoResponse } from '../response/notificacao.response';

export class NotificacaoConverter {
  static paraResponseDto(entity: NotificacaoEntity): NotificacaoResponse {
    if (
      entity.canal !== 'email' ||
      entity.email_destinatario === null ||
      entity.status === null
    ) {
      throw new Error('Notificação de e-mail inconsistente.');
    }
    const dados = { ...entity.dados };
    delete dados[CHAVE_SEGREDO_NOTIFICACAO];
    return {
      idNotificacao: entity.id_notificacao,
      idUsuario: entity.id_usuario,
      emailDestinatario: entity.email_destinatario,
      tipoEvento: entity.tipo_evento,
      status: entity.status,
      tentativas: entity.tentativas,
      criadoEm: entity.criado_em,
      enviadoEm: entity.enviado_em,
      proximaTentativaEm: entity.proxima_tentativa_em,
      ultimoErro: entity.ultimo_erro,
      assunto: entity.assunto,
      provedor: entity.provedor,
      idMensagemProvedor: entity.id_mensagem_provedor,
      dados,
    };
  }
}
