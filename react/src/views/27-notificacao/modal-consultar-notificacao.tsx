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

// O sistema guarda o assunto do e-mail, não o texto: o Conteúdo é montado de novo com o modelo de hoje.
const AJUDA_CONTEUDO_EMAIL =
  'Montado com o texto atual da tela Mensagens, sem o botão do e-mail. Se o texto foi alterado depois do envio, pode não ser exatamente o que saiu: o histórico do texto está no log da tela Mensagens.';

interface ModalConsultarNotificacaoProps {
  notificacao: NotificacaoResponse;
  aoFechar: () => void;
}

// Em blocos, como a ficha da denúncia: para quem e o quê, o envio, a mensagem e, por último, o técnico.
export function ModalConsultarNotificacao({ notificacao, aoFechar }: ModalConsultarNotificacaoProps) {
  const dados = textoDados(notificacao.dados);
  const sino = notificacao.canal === 'interna';
  const pre = (texto: string | null) => texto && <span className="whitespace-pre-line">{texto}</span>;
  const criadoEm = <CampoFicha rotulo="Criado em" valor={formatarDataHora(notificacao.criadoEm)} />;
  const detalhes = <CampoFicha rotulo="Dados do texto" largura="cheia" valor={pre(dados)} />;
  return (
    <ModalFicha
      titulo={`${sino ? 'Aviso do sino' : 'E-mail'} #${notificacao.idNotificacao}`}
      subtitulo={rotuloTipoNotificacao(notificacao.tipoEvento)}
      badges={[<BadgeStatusNotificacao key="status" status={notificacao.status} canal={notificacao.canal} lidaEm={notificacao.lidaEm} />]}
      aoFechar={aoFechar}
      rodape={<RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />}
    >
      <div className="space-y-6">
        {sino ? (
          <>
            <SecaoFicha titulo="O aviso">
              <CampoFicha rotulo="Para" valor={notificacao.nomeUsuario} />
              <CampoFicha rotulo="Lida em" valor={notificacao.lidaEm ? formatarDataHora(notificacao.lidaEm) : null} />
              <CampoFicha rotulo="Título" valor={notificacao.assunto} />
              {criadoEm}
            </SecaoFicha>
            <SecaoFicha titulo="Mensagem" colunas={1}>
              <CampoFicha rotulo="Conteúdo" valor={pre(notificacao.conteudo)} />
            </SecaoFicha>
            <SecaoFicha titulo="Detalhes técnicos">{detalhes}</SecaoFicha>
          </>
        ) : (
          <>
            <SecaoFicha titulo="O e-mail">
              <CampoFicha rotulo="Para" valor={notificacao.nomeUsuario} />
              <CampoFicha rotulo="E-mail" valor={notificacao.emailDestinatario} />
              <CampoFicha rotulo="Assunto" valor={notificacao.assunto ?? 'Montado na hora de enviar'} />
              {criadoEm}
            </SecaoFicha>
            {/* Um campo só para o resultado do envio: a data quando saiu; senão, quantas vezes o sistema tentou. */}
            <SecaoFicha titulo="Envio">
              {notificacao.enviadoEm ? (
                <CampoFicha rotulo="Enviado em" valor={formatarDataHora(notificacao.enviadoEm)} />
              ) : (
                <CampoFicha rotulo="Tentativas de envio" valor={notificacao.tentativas === 0 ? 'Nenhuma ainda' : String(notificacao.tentativas)} />
              )}
              {notificacao.ultimoErro && <CampoFicha rotulo="Último erro" valor={notificacao.ultimoErro} />}
              {notificacao.status === 'pendente' && (
                <CampoFicha rotulo="Próxima tentativa" valor={formatarDataHora(notificacao.proximaTentativaEm)} />
              )}
            </SecaoFicha>
            <SecaoFicha titulo="Mensagem" colunas={1}>
              <CampoFicha
                rotulo="Conteúdo"
                valor={pre(notificacao.conteudo)}
                dica={AJUDA_CONTEUDO_EMAIL}
              />
            </SecaoFicha>
            <SecaoFicha titulo="Detalhes técnicos">
              <CampoFicha rotulo="Id no provedor" valor={notificacao.idMensagemProvedor} />
              <CampoFicha rotulo="Provedor" valor={rotuloProvedorEmail(notificacao.provedor)} />
              {detalhes}
            </SecaoFicha>
          </>
        )}
      </div>
    </ModalFicha>
  );
}
