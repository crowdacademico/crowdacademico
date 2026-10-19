import { useCallback, useEffect, useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { GenericTable } from '../../components/crud/generic-table';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import { caixaEmailApi, type EmailCapturado } from '../servicos/api/caixa-email.api';
import { bancadaPagamentoApi } from '../servicos/api/bancada-pagamento.api';
import { useChamadaRegistrada } from '../servicos/hook/use-chamada-registrada';
import { ENVIO_EMAIL_AUTOMATICO } from '../../services/11-configuracoes/constants/tarefas-automaticas.constants';
import { CardsTarefasAutomaticas } from './cards-tarefas-automaticas';
import type { PropsPagina } from '../../services/router/pagina.type';

// T6: a caixa de entrada do provedor de e-mail de teste (EMAIL_PROVIDER=fake, o padrão em desenvolvimento). Mostra cada
// e-mail como ele sairia (texto e HTML), sem mandar nada para fora. O card "Enviar os e-mails" é a tarefa automática:
// desligada (o padrão no banco de demonstração), o e-mail espera na fila até o Rodar agora. A situação de cada e-mail
// (na fila, enviado, falhou) fica na aba Notificações do Dashboard.
export function CaixaEmails({ auth }: PropsPagina) {
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const [aberto, setAberto] = useState<EmailCapturado | null>(null);
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
    () => caixaEmailApi.listar(auth.authFetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.authFetch, chaveRecarga],
  );

  const enviarAgora = async () => {
    setRodando(ENVIO_EMAIL_AUTOMATICO.tarefa);
    try {
      await bancadaPagamentoApi.rodar(chamar, ENVIO_EMAIL_AUTOMATICO.tarefa);
      mostrar('Fila de e-mails enviada.', 'Os e-mails que esperavam já estão na caixa.');
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
      <GenericTable<EmailCapturado>
        titulo="Caixa de E-mails"
        ajuda="Os e-mails que o sistema enviou pelo provedor de teste, do mais novo para o mais antigo. Nada sai para fora: é aqui que se confere o texto e os links. A caixa se apaga quando o Nest reinicia."
        acaoTopo={
          <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => void limpar()}>
            Limpar a caixa
          </button>
        }
        colunas={[
          { chave: 'idMensagem', rotulo: 'id', tipo: 'texto' },
          { chave: 'para', rotulo: 'para', tipo: 'texto' },
          { chave: 'assunto', rotulo: 'assunto', tipo: 'nome', umaLinha: true },
          { chave: 'enviadoEm', rotulo: 'enviado em', tipo: 'dataHora' },
        ]}
        vazio={{
          icone: 'fa-envelope-open',
          titulo: 'Nenhum e-mail na caixa.',
          texto: 'Cadastre uma conta, peça uma nova senha ou aprove uma campanha, e clique em Rodar agora no card Enviar os e-mails.',
        }}
        chavePrimaria="idMensagem"
        listar={listar}
        chaveRecarga={chaveRecarga}
        acoes={{ consultar: (linha) => setAberto(linha) }}
      />

      {aberto && (
        <ModalFicha
          titulo={aberto.assunto}
          subtitulo={`Para ${aberto.para}`}
          aoFechar={() => setAberto(null)}
          rodape={<RodapeAcoes aoCancelar={() => setAberto(null)} rotuloCancelar="Fechar" />}
        >
          <div className="space-y-6">
            <SecaoFicha titulo="Como a pessoa vê" colunas={1}>
              {/* sandbox sem permissões: o HTML do e-mail não roda script nem navega a página do painel. */}
              <iframe title="Prévia do e-mail" sandbox="" srcDoc={aberto.html} className="w-full h-96 rounded border-0" />
            </SecaoFicha>
            <SecaoFicha titulo="Versão em texto puro" colunas={1}>
              <CampoFicha rotulo="Enviado em" valor={formatarDataHora(aberto.enviadoEm)} />
              <CampoFicha rotulo="Texto" largura="cheia" valor={<span className="whitespace-pre-line">{aberto.texto}</span>} />
            </SecaoFicha>
          </div>
        </ModalFicha>
      )}
    </div>
    </>
  );
}
