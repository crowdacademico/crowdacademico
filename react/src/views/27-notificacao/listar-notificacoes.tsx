import { useCallback, useState } from 'react';
import { BadgeStatusNotificacao } from '../../components/crud/badge-status-notificacao';
import { GenericTable } from '../../components/crud/generic-table';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { notificacaoApi } from '../../services/27-notificacao/api/notificacao.api';
import {
  ORDEM_STATUS_NOTIFICACAO,
  ROTULO_CANAL_NOTIFICACAO,
  ROTULO_LEITURA_SINO,
  ROTULO_STATUS_NOTIFICACAO,
  rotuloTipoNotificacao,
} from '../../services/27-notificacao/constants/notificacao.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { ModalConsultarNotificacao } from './modal-consultar-notificacao';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { NotificacaoResponse } from '../../services/27-notificacao/type/notificacao.type';
import { ordenarFilaSla } from '../../services/constant/util/fila-sla.util';

interface NotificacaoLinha extends NotificacaoResponse {
  tipo: string;
  canalRotulo: string;
  // O e-mail; no sino, o nome da conta.
  para: string;
  statusRotulo: string;
  // "Esperando" só no que ainda pede algo (na fila ou falhou).
  esperandoDesde: string | null;
}

type Pedido = { acao: 'reenviar' | 'cancelar'; linha: NotificacaoLinha };

// A situação em texto (filtro e busca): a do envio no e-mail, a da leitura no sino.
const situacaoTexto = (n: NotificacaoResponse): string =>
  n.canal === 'interna' ? ROTULO_LEITURA_SINO[n.lidaEm ? 'lida' : 'naoLida'] : ROTULO_STATUS_NOTIFICACAO[n.status];
const ORDEM_SITUACAO = [...ORDEM_STATUS_NOTIFICACAO.map((s) => ROTULO_STATUS_NOTIFICACAO[s]), ROTULO_LEITURA_SINO.naoLida, ROTULO_LEITURA_SINO.lida];

// O ⓘ do título, em blocos (a bolha respeita o "\n"): deixa claro que reenviar é exceção, não rotina.
const AJUDA_ENVIOS = [
  'Todos os avisos do sistema, por e-mail e pelo sino do painel, de todas as contas. Os e-mails que esperam (na fila ou que falharam) vêm primeiro, o mais antigo no topo.',
  'Na fila: sai sozinho em até 1 minuto, com a tarefa Enviar os e-mails ligada (desligada, só pelo Rodar agora da T6). Se o envio falhar por algo passageiro, a própria tarefa tenta de novo, várias vezes.',
  'Falhou: a tarefa desistiu (endereço recusado ou tentativas esgotadas). Só aqui alguém precisa agir: corrija a causa e Reenvie (vai para o e-mail atual da conta), ou Cancele.',
  'Ninguém precisa clicar em Reenviar no dia a dia.',
  'Sino: chega na hora, sem fila. A situação diz só se a pessoa já leu.',
  'O texto de cada aviso se edita em Configurações > Mensagens.',
].join('\n\n');

// Notificações (RF-126): todo aviso que o sistema mandou, por e-mail e pelo sino. Fila do SLA (DS-49): primeiro o e-mail que
// espera (na fila ou que falhou), o mais antigo no topo; depois o resto, o mais novo primeiro. O envio é sozinho, a cada
// minuto (worker do Nest, 4-mail); aqui só se vê e se trata o e-mail que falhou: Reenviar põe de volta na fila,
// Cancelar tira de vez. O sino não tem envio, então não tem as duas ações.
export function ListarNotificacoes({ auth }: PropsPagina) {
  const { authFetch } = auth;
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
      canalRotulo: ROTULO_CANAL_NOTIFICACAO[n.canal],
      para: n.emailDestinatario ?? n.nomeUsuario ?? '-',
      statusRotulo: situacaoTexto(n),
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
        mostrar('E-mail de volta na fila.', `O e-mail #${linha.idNotificacao} sai na próxima vez que o envio rodar.`);
      } else {
        await notificacaoApi.cancelar(authFetch, linha.idNotificacao);
        mostrar('Envio cancelado.', `O e-mail #${linha.idNotificacao} não vai mais sair.`);
      }
      setChaveRecarga((atual) => atual + 1);
    });
    setPedido(null);
  };

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Notificações"
        ajuda={AJUDA_ENVIOS}
        colunas={[
          { chave: 'idNotificacao', rotulo: 'id', tipo: 'id' },
          { chave: 'tipo', rotulo: 'tipo', tipo: 'nome', umaLinha: true },
          { chave: 'canalRotulo', rotulo: 'canal', tipo: 'texto' },
          { chave: 'para', rotulo: 'para', tipo: 'texto' },
          { chave: 'criadoEm', rotulo: 'criado em', tipo: 'dataHora' },
          { chave: 'esperandoDesde', rotulo: 'esperando', tipo: 'espera' },
          {
            chave: 'statusRotulo',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: NotificacaoLinha) => <BadgeStatusNotificacao status={linha.status} canal={linha.canal} lidaEm={linha.lidaEm} />,
            textoExibido: (linha: NotificacaoLinha) => linha.statusRotulo,
          },
        ]}
        vazio={{
          icone: 'fa-envelope-circle-check',
          titulo: 'Nenhum aviso nesta situação.',
          texto: 'Os avisos aparecem aqui assim que algum evento os pede (cadastro, aprovação de campanha, devolução...).',
        }}
        chavePrimaria="idNotificacao"
        listar={listar}
        acoes={{
          consultar: (linha) => setConsultando(linha),
          reenviar: (linha) => setPedido({ acao: 'reenviar', linha }),
          cancelarEnvio: (linha) => setPedido({ acao: 'cancelar', linha }),
        }}
        acaoIndisponivel={(linha, acao) => {
          if (linha.canal === 'interna' && (acao === 'reenviar' || acao === 'cancelarEnvio'))
            return 'O aviso do sino chega na hora: não tem envio para reenviar ou cancelar.';
          if (acao === 'reenviar' && linha.status !== 'falhou') return 'Só um e-mail que falhou pode ser reenviado.';
          if (acao === 'cancelarEnvio' && linha.status !== 'pendente' && linha.status !== 'falhou')
            return 'Só um e-mail na fila ou que falhou pode ser cancelado.';
          return undefined;
        }}
        filtrosFacetados={[
          { chave: 'canalRotulo', rotulo: 'Canal' },
          { chave: 'statusRotulo', rotulo: 'Situação', ordem: ORDEM_SITUACAO },
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
              O e-mail volta para a fila, com as tentativas zeradas, e sai para o e-mail <strong>atual</strong> da conta (se a pessoa corrigiu o endereço, vai para o novo) na próxima vez que o envio rodar (sozinho a cada minuto com a tarefa Enviar os e-mails ligada; desligada, pelo Rodar agora da T6). Corrija antes a causa do erro, ou ele falha de novo.
            </p>
          ) : (
            <p>O e-mail para {pedido.linha.emailDestinatario} não vai mais sair. Se ele tinha um link (confirmar a conta, nova senha), o link é apagado.</p>
          )}
        </ModalConfirmacao>
      )}
    </div>
  );
}
