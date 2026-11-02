import type { NotificacaoEntity } from '../../../commons/database/db.types';
import { CHAVE_SEGREDO_NOTIFICACAO } from '../../constants/notificacao.constants';
import {
  montarParagrafos,
  montarTexto,
  primeiroNome,
} from '../../util/montar-texto-modelo';
import { NotificacaoResponse } from '../response/notificacao.response';

// O que vem de outras tabelas na lista do painel: o nome da conta e o modelo do canal do aviso (tela Mensagens).
interface ExtrasNotificacao {
  nomeUsuario?: string | null;
  tituloModelo?: string | null;
  corpoModelo?: string | null;
}

export class NotificacaoConverter {
  static paraResponseDto(
    entity: NotificacaoEntity,
    extras: ExtrasNotificacao = {},
  ): NotificacaoResponse {
    const dados = { ...entity.dados };
    delete dados[CHAVE_SEGREDO_NOTIFICACAO];
    // O aviso do sino não guarda assunto: o título é montado do modelo, como o sino faz.
    const assunto =
      entity.canal === 'interna'
        ? montarTexto(extras.tituloModelo ?? entity.tipo_evento, dados)
            .replace(/\s+/g, ' ')
            .trim()
        : entity.assunto;
    // O texto do aviso montado com o modelo de hoje: no e-mail, a saudação e os parágrafos, sem o botão (o de alguns
    // e-mails leva o link com token, que nunca chega ao painel).
    const paragrafos =
      extras.corpoModelo == null
        ? null
        : montarParagrafos(extras.corpoModelo, dados);
    const nome = primeiroNome(dados);
    const conteudo =
      paragrafos &&
      (entity.canal === 'email'
        ? [nome ? `Olá, ${nome}!` : 'Olá!', ...paragrafos]
        : paragrafos
      ).join('\n\n');
    return {
      idNotificacao: entity.id_notificacao,
      idUsuario: entity.id_usuario,
      nomeUsuario: extras.nomeUsuario ?? null,
      canal: entity.canal,
      emailDestinatario: entity.email_destinatario,
      tipoEvento: entity.tipo_evento,
      status: entity.status,
      tentativas: entity.tentativas,
      criadoEm: entity.criado_em,
      enviadoEm: entity.enviado_em,
      lidaEm: entity.lida_em,
      proximaTentativaEm: entity.proxima_tentativa_em,
      ultimoErro: entity.ultimo_erro,
      assunto,
      conteudo,
      provedor: entity.provedor,
      idMensagemProvedor: entity.id_mensagem_provedor,
      dados,
    };
  }
}
