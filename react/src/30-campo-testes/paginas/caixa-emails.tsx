import { useCallback, useEffect, useState } from 'react';
import { BadgeStatusNotificacao } from '../../components/crud/badge-status-notificacao';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { GenericTable } from '../../components/crud/generic-table';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { ORDEM_STATUS_NOTIFICACAO, ROTULO_STATUS_NOTIFICACAO } from '../../services/27-notificacao/constants/notificacao.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import { caixaEmailApi, type EmailDaCaixa, type PreviaDoEmail } from '../servicos/api/caixa-email.api';
import { bancadaPagamentoApi } from '../servicos/api/bancada-pagamento.api';
import { useChamadaRegistrada } from '../servicos/hook/use-chamada-registrada';
import { ENVIO_EMAIL_AUTOMATICO } from '../../services/11-configuracoes/constants/tarefas-automaticas.constants';
import { CardsTarefasAutomaticas } from './cards-tarefas-automaticas';
import type { PropsPagina } from '../../services/router/pagina.type';

interface EmailLinha extends EmailDaCaixa {
  situacao: string;
}

// T6: a Caixa de E-mails. Lista TODOS os e-mails do banco desde a última limpeza (na fila, enviados, que falharam,
// cancelados), e só o "Limpar a caixa" tira alguém dela (reiniciar o Nest não apaga nada). Consultar mostra o e-mail como
// a pessoa vê: o que o provedor de teste recebeu ou, se ainda está na fila, o que vai sair. O card "Enviar os e-mails" é
// a tarefa automática: desligada (o padrão no banco de demonstração), o e-mail espera na fila até o Rodar agora, que
// manda também o que espera uma nova tentativa.
export function CaixaEmails({ auth }: PropsPagina) {
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const [aberto, setAberto] = useState<{ email: EmailDaCaixa; previa: PreviaDoEmail } | null>(null);
  const { reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const chamar = useChamadaRegistrada(auth);
  const [intervalosMinutos, setIntervalosMinutos] = useState<Record<string, number>>({});
  const [rodando, setRodando] = useState<string | null>(null);

  // O intervalo de cada tarefa vem do Nest (o mesmo estado da T5).
  useEffect(() => {
    bancadaPagamentoApi
      .estado(chamar)
      .then((estado) => setIntervalosMinutos(estado.intervalosMinutos))
      .catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listar = useCallback(
    async (): Promise<EmailLinha[]> =>
      (await caixaEmailApi.listar(auth.authFetch)).map((email) => ({ ...email, situacao: ROTULO_STATUS_NOTIFICACAO[email.status] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.authFetch, chaveRecarga],
  );

  const enviarAgora = async () => {
    setRodando(ENVIO_EMAIL_AUTOMATICO.tarefa);
    try {
      await bancadaPagamentoApi.rodar(chamar, ENVIO_EMAIL_AUTOMATICO.tarefa);
      mostrar('Fila de e-mails enviada.', 'Tudo o que estava na fila saiu, inclusive o que esperava uma nova tentativa.');
      setChaveRecarga((atual) => atual + 1);
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setRodando(null);
    }
  };

  const limpar = () =>
    executar(async () => {
      await caixaEmailApi.limpar(auth.authFetch);
      setChaveRecarga((atual) => atual + 1);
    });

  const consultar = (email: EmailDaCaixa) =>
    executar(async () => {
      setAberto({ email, previa: await caixaEmailApi.previa(auth.authFetch, email.idNotificacao) });
    });

  return (
    <>
      <div className="admin-content-painel">
        <CardsTarefasAutomaticas
          auth={auth}
          cards={[ENVIO_EMAIL_AUTOMATICO]}
          provedorDeTeste
          intervalosMinutos={intervalosMinutos}
          rodando={rodando}
          aoErro={reportarErro}
          aoRodar={() => void enviarAgora()}
        />
      </div>

      <div className="admin-content-painel">
        <GenericTable<EmailLinha>
          titulo="Caixa de E-mails"
          ajuda="Todos os e-mails do sistema desde a última limpeza, do mais novo para o mais antigo: na fila, enviados, que falharam e cancelados. Com o provedor de teste nada sai para fora: é aqui que se confere o texto e os links. Só o Limpar a caixa tira os e-mails desta lista (eles continuam na aba Notificações do Dashboard)."
          acaoTopo={
            <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => void limpar()}>
              Limpar a caixa
            </button>
          }
          colunas={[
            { chave: 'idNotificacao', rotulo: 'id', tipo: 'id' },
            { chave: 'para', rotulo: 'para', tipo: 'texto' },
            { chave: 'assunto', rotulo: 'assunto', tipo: 'nome', umaLinha: true },
            { chave: 'criadoEm', rotulo: 'criado em', tipo: 'dataHora' },
            { chave: 'enviadoEm', rotulo: 'enviado em', tipo: 'dataHora' },
            {
              chave: 'situacao',
              rotulo: 'situação',
              tipo: 'status',
              renderizar: (linha: EmailLinha) => <BadgeStatusNotificacao status={linha.status} />,
              textoExibido: (linha: EmailLinha) => ROTULO_STATUS_NOTIFICACAO[linha.status],
            },
          ]}
          vazio={{
            icone: 'fa-envelope-open',
            titulo: 'Nenhum e-mail na caixa.',
            texto: 'Cadastre uma conta, peça uma nova senha ou aprove uma campanha: o e-mail aparece aqui na hora, na fila. Rodar agora, no card Enviar os e-mails, manda.',
          }}
          chavePrimaria="idNotificacao"
          listar={listar}
          chaveRecarga={chaveRecarga}
          acoes={{ consultar: (linha) => void consultar(linha) }}
          filtrosFacetados={[
            { chave: 'situacao', rotulo: 'Situação', ordem: ORDEM_STATUS_NOTIFICACAO.map((s) => ROTULO_STATUS_NOTIFICACAO[s]) },
          ]}
        />

        {aberto && (
          <ModalFicha
            titulo={aberto.previa.assunto}
            subtitulo={`Para ${aberto.email.para}`}
            badges={[<BadgeStatusNotificacao key="status" status={aberto.email.status} />]}
            aoFechar={() => setAberto(null)}
            rodape={<RodapeAcoes aoCancelar={() => setAberto(null)} rotuloCancelar="Fechar" />}
          >
            <div className="space-y-6">
              <SecaoFicha titulo="Como a pessoa vê" colunas={1}>
                {!aberto.previa.exato && (
                  <p className="legenda texto-fraco">
                    {aberto.email.status === 'pendente' ? 'Ainda na fila: este é o e-mail que vai sair.' : 'Montado de novo a partir dos dados do e-mail (o Nest reiniciou depois do envio).'}
                  </p>
                )}
                {/* sandbox sem permissões: o HTML do e-mail não roda script nem navega a página do painel. */}
                <iframe title="Prévia do e-mail" sandbox="" srcDoc={aberto.previa.html} className="w-full h-96 rounded border-0" />
              </SecaoFicha>
              <SecaoFicha titulo="Versão em texto puro" colunas={1}>
                <CampoFicha rotulo="Criado em" valor={formatarDataHora(aberto.email.criadoEm)} />
                <CampoFicha rotulo="Enviado em" valor={aberto.email.enviadoEm ? formatarDataHora(aberto.email.enviadoEm) : 'Ainda não'} />
                <CampoFicha rotulo="Texto" largura="cheia" valor={<span className="whitespace-pre-line">{aberto.previa.texto}</span>} />
              </SecaoFicha>
            </div>
          </ModalFicha>
        )}
      </div>
    </>
  );
}
