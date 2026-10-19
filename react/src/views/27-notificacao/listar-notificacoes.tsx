import { useCallback, useState } from 'react';
import { BadgeStatusNotificacao } from '../../components/crud/badge-status-notificacao';
import { GenericTable } from '../../components/crud/generic-table';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { notificacaoApi } from '../../services/27-notificacao/api/notificacao.api';
import {
  ORDEM_STATUS_NOTIFICACAO,
  ROTULO_STATUS_NOTIFICACAO,
  rotuloTipoNotificacao,
} from '../../services/27-notificacao/constants/notificacao.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { ModalConsultarNotificacao } from './modal-consultar-notificacao';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { NotificacaoResponse } from '../../services/27-notificacao/type/notificacao.type';
import { ordenarFilaSla } from '../../services/constant/util/fila-sla.util';

interface NotificacaoLinha extends NotificacaoResponse {
  tipo: string;
  statusRotulo: string;
  assuntoTexto: string;
  // "Esperando" só no que ainda pede algo (na fila ou falhou).
  esperandoDesde: string | null;
}

type Pedido = { acao: 'reenviar' | 'cancelar'; linha: NotificacaoLinha };

// Aba Notificações do Dashboard (RF-121): todo e-mail que o sistema pôs na fila. Fila do SLA (DS-49): primeiro o que
// espera (na fila ou que falhou), o mais antigo no topo; depois os enviados e cancelados, o mais novo primeiro. O
// envio é sozinho, a cada minuto (worker do Nest, 4-mail); aqui só se vê e se trata o que falhou: Reenviar põe de volta
// na fila, Cancelar tira de vez. Mora em 27-notificacao (o dono do dado), aparece dentro do Dashboard.
export function ListarNotificacoes({ authFetch }: { authFetch: AuthFetch }) {
  const [consultando, setConsultando] = useState<NotificacaoResponse | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);

  const listar = useCallback(async (): Promise<NotificacaoLinha[]> => {
    const lista = await notificacaoApi.listar(authFetch);
    const esperandoDesde = (n: NotificacaoResponse) => (n.status === 'pendente' || n.status === 'falhou' ? n.criadoEm : null);
    return ordenarFilaSla(lista, esperandoDesde, (n) => n.criadoEm).map((n) => ({
      ...n,
      tipo: rotuloTipoNotificacao(n.tipoEvento),
      statusRotulo: ROTULO_STATUS_NOTIFICACAO[n.status],
      assuntoTexto: n.assunto ?? '-',
      esperandoDesde: esperandoDesde(n),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, chaveRecarga]);

  const confirmar = async () => {
    if (!pedido) return;
    await executar(async () => {
      const { acao, linha } = pedido;
      if (acao === 'reenviar') {
        await notificacaoApi.reenviar(authFetch, linha.idNotificacao);
        mostrar('E-mail de volta na fila.', `O e-mail #${linha.idNotificacao} sai no próximo minuto.`);
      } else {
        await notificacaoApi.cancelar(authFetch, linha.idNotificacao);
        mostrar('Envio cancelado.', `O e-mail #${linha.idNotificacao} não vai mais sair.`);
      }
      setChaveRecarga((atual) => atual + 1);
    });
    setPedido(null);
  };

  return (
    <>
      <GenericTable
        titulo="Notificações"
        nivelTitulo={2}
        ajuda="Todos os e-mails do sistema. Os que esperam (na fila ou que falharam) vêm primeiro, o mais antigo no topo; depois os outros, do mais novo para o mais antigo. Na fila: sai no próximo minuto, ou espera uma nova tentativa depois de um erro passageiro. Falhou: as tentativas acabaram ou o endereço foi recusado; reenvie depois de corrigir a causa, ou cancele. Os textos de cada tipo de e-mail ficam no código (nest/src/4-mail/modelos)."
        colunas={[
          { chave: 'idNotificacao', rotulo: 'id', tipo: 'id' },
          { chave: 'tipo', rotulo: 'tipo', tipo: 'nome', umaLinha: true },
          { chave: 'emailDestinatario', rotulo: 'para', tipo: 'texto' },
          { chave: 'assuntoTexto', rotulo: 'assunto', tipo: 'texto', umaLinha: true },
          { chave: 'criadoEm', rotulo: 'criado em', tipo: 'dataHora' },
          { chave: 'esperandoDesde', rotulo: 'esperando', tipo: 'espera' },
          {
            chave: 'statusRotulo',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: NotificacaoLinha) => <BadgeStatusNotificacao status={linha.status} />,
            textoExibido: (linha: NotificacaoLinha) => ROTULO_STATUS_NOTIFICACAO[linha.status],
          },
        ]}
        vazio={{
          icone: 'fa-envelope-circle-check',
          titulo: 'Nenhum e-mail nesta situação.',
          texto: 'Os e-mails aparecem aqui assim que algum evento os pede (cadastro, aprovação de campanha, devolução...).',
        }}
        chavePrimaria="idNotificacao"
        listar={listar}
        acoes={{
          consultar: (linha) => setConsultando(linha),
          reenviar: (linha) => setPedido({ acao: 'reenviar', linha }),
          cancelarEnvio: (linha) => setPedido({ acao: 'cancelar', linha }),
        }}
        acaoIndisponivel={(linha, acao) => {
          if (acao === 'reenviar' && linha.status !== 'falhou') return 'Só um e-mail que falhou pode ser reenviado.';
          if (acao === 'cancelarEnvio' && linha.status !== 'pendente' && linha.status !== 'falhou')
            return 'Só um e-mail na fila ou que falhou pode ser cancelado.';
          return undefined;
        }}
        filtrosFacetados={[
          { chave: 'statusRotulo', rotulo: 'Situação', ordem: ORDEM_STATUS_NOTIFICACAO.map((s) => ROTULO_STATUS_NOTIFICACAO[s]) },
          { chave: 'tipo', rotulo: 'Tipo' },
        ]}
      />

      {consultando && <ModalConsultarNotificacao notificacao={consultando} aoFechar={() => setConsultando(null)} />}

      {pedido && (
        <ModalConfirmacao
          titulo={pedido.acao === 'reenviar' ? 'Reenviar este e-mail?' : 'Cancelar o envio deste e-mail?'}
          rotuloConfirmar={pedido.acao === 'reenviar' ? 'Reenviar' : 'Cancelar envio'}
          rotuloOcupado="Salvando..."
          perigo={pedido.acao === 'cancelar'}
          ocupado={ocupado}
          aoConfirmar={() => void confirmar()}
          aoCancelar={() => setPedido(null)}
        >
          {pedido.acao === 'reenviar' ? (
            <p>
              O e-mail para {pedido.linha.emailDestinatario} volta para a fila, com as tentativas zeradas, e sai no próximo minuto.
              Corrija antes a causa do erro, ou ele falha de novo.
            </p>
          ) : (
            <p>O e-mail para {pedido.linha.emailDestinatario} não vai mais sair. Se ele tinha um link (confirmar a conta, nova senha), o link é apagado.</p>
          )}
        </ModalConfirmacao>
      )}
    </>
  );
}
