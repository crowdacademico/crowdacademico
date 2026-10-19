import { BadgeStatusNotificacao } from '../../components/crud/badge-status-notificacao';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { rotuloProvedorEmail, rotuloTipoNotificacao } from '../../services/27-notificacao/constants/notificacao.constants';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import type { NotificacaoResponse } from '../../services/27-notificacao/type/notificacao.type';

// Os dados que o texto do e-mail usa, legíveis: "titulo: Mapa da Mata Atlântica". O link com token nunca chega aqui.
function textoDados(dados: Record<string, unknown>): string | null {
  const linhas = Object.entries(dados)
    .filter(([, valor]) => valor !== null && valor !== '')
    .map(([chave, valor]) => `${chave}: ${typeof valor === 'string' ? valor : JSON.stringify(valor)}`);
  return linhas.length > 0 ? linhas.join('\n') : null;
}

interface ModalConsultarNotificacaoProps {
  notificacao: NotificacaoResponse;
  aoFechar: () => void;
}

export function ModalConsultarNotificacao({ notificacao, aoFechar }: ModalConsultarNotificacaoProps) {
  const dados = textoDados(notificacao.dados);
  return (
    <ModalFicha
      titulo={`E-mail #${notificacao.idNotificacao}`}
      subtitulo={rotuloTipoNotificacao(notificacao.tipoEvento)}
      badges={[<BadgeStatusNotificacao key="status" status={notificacao.status} />]}
      aoFechar={aoFechar}
      rodape={<RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />}
    >
      <div className="space-y-6">
        <SecaoFicha titulo="O e-mail">
          <CampoFicha rotulo="Para" valor={notificacao.emailDestinatario} />
          <CampoFicha rotulo="Assunto" valor={notificacao.assunto ?? 'Montado na hora de enviar'} />
          <CampoFicha rotulo="Criado em" valor={formatarDataHora(notificacao.criadoEm)} />
          <CampoFicha rotulo="Enviado em" valor={notificacao.enviadoEm ? formatarDataHora(notificacao.enviadoEm) : null} />
          {notificacao.status === 'pendente' && (
            <CampoFicha rotulo="Próxima tentativa" valor={formatarDataHora(notificacao.proximaTentativaEm)} />
          )}
          <CampoFicha rotulo="Tentativas" valor={String(notificacao.tentativas)} />
          <CampoFicha rotulo="Provedor" valor={rotuloProvedorEmail(notificacao.provedor)} />
          <CampoFicha rotulo="Id no provedor" valor={notificacao.idMensagemProvedor} />
          <CampoFicha rotulo="Último erro" valor={notificacao.ultimoErro} largura="cheia" />
          <CampoFicha rotulo="Dados do texto" largura="cheia" valor={dados ? <span className="whitespace-pre-line">{dados}</span> : null} />
        </SecaoFicha>
      </div>
    </ModalFicha>
  );
}
