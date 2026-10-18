import { useCallback, useState } from 'react';
import { BadgeStatusContribuicao } from '../../components/crud/badge-status-contribuicao';
import { BadgeStatusRepasse } from '../../components/crud/badge-status-repasse';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import { ROTULO_STATUS_CONTRIBUICAO } from '../../services/22-contribuicao/constants/status-contribuicao.constants';
import { rotuloSituacaoRepasse } from '../../services/23-repasse/constants/status-repasse.constants';
import { GenericTable } from '../../components/crud/generic-table';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { useChamadaRegistrada } from '../servicos/hook/use-chamada-registrada';
import {
  bancadaPagamentoApi,
  ehChamadaDeContribuicoes,
  ehChamadaDeRepasses,
  type ContribuicaoBancada,
  type RepasseBancada,
} from '../servicos/api/bancada-pagamento.api';
import { ModalChavePix, ModalConsultarContribuicao, ModalGerarPix } from './modais-bancada-pagamento';
import { RegistroChamadas } from './registro-chamadas';
import { CardsTarefasAutomaticas } from './cards-tarefas-automaticas';
import type { PropsPagina } from '../../services/router/pagina.type';

// O que o provedor de teste diz da cobrança ou da transferência.
const ROTULO_NO_PROVEDOR: Record<string, string> = {
  pendente: 'Aguardando',
  confirmada: 'Paga',
  expirada: 'Vencida',
  estornada: 'Estornada',
  cancelada: 'Cancelada',
  processando: 'Em andamento',
  concluido: 'Concluída',
  erro: 'Falhou',
  perdida: 'Perdida (o Nest reiniciou)',
};

const rotuloNoProvedor = (status: string | null) => (status === null ? '-' : (ROTULO_NO_PROVEDOR[status] ?? status));
// O cartão diz se o dinheiro já foi liberado pelo provedor; os outros meios, só o nome.
const rotuloMeio = (linha: ContribuicaoBancada) =>
  linha.meioPagamento === 'cartao_credito'
    ? linha.dinheiroLiberado
      ? 'Cartão (liberado)'
      : 'Cartão (a liberar)'
    : ROTULO_MEIO_PAGAMENTO[linha.meioPagamento];

// T05, Bancada de Pagamento. Faz o papel de quem paga (Gerar Pix) e do provedor de teste (pagar, vencer, repetir o
// aviso, concluir ou falhar a transferência), e roda na hora as tarefas que o sistema faz sozinho de tempos em
// tempos. Tudo passa pelo caminho de verdade: rota de contribuição, webhook, funções do banco e workers.
export function BancadaPagamento({ auth }: PropsPagina) {
  const chamar = useChamadaRegistrada(auth);
  const { chaveRecarga, recarregar } = useCrudModais<ContribuicaoBancada>();
  const [provedorDeTeste, setProvedorDeTeste] = useState(true);
  const [provedor, setProvedor] = useState('');
  const [intervalosMinutos, setIntervalosMinutos] = useState<Record<string, number>>({});
  const [gerandoPix, setGerandoPix] = useState(false);
  const [consultando, setConsultando] = useState<ContribuicaoBancada | null>(null);
  const [cadastrandoChave, setCadastrandoChave] = useState(false);
  const [rodando, setRodando] = useState<string | null>(null);
  const { reportarErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();

  const buscarEstado = useCallback(async () => {
    const estado = await bancadaPagamentoApi.estado(chamar);
    setProvedorDeTeste(estado.provedorDeTeste);
    setProvedor(estado.provedor);
    setIntervalosMinutos(estado.intervalosMinutos);
    return estado;
  }, [chamar]);

  const listarContribuicoes = useCallback(async () => (await buscarEstado()).contribuicoes, [buscarEstado]);
  const listarRepasses = useCallback(async () => (await buscarEstado()).repasses, [buscarEstado]);

  // Toda ação: chama, avisa e recarrega as duas tabelas (o aviso do provedor já foi processado quando a rota responde).
  const agir = async (chave: string, acao: () => Promise<void>, feito: string) => {
    setRodando(chave);
    try {
      await acao();
      mostrar(feito);
      recarregar();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setRodando(null);
    }
  };

  return (
    <>
      {provedorDeTeste ? (
        <CaixaAviso titulo="Modo rápido: provedor de teste (Nest iniciado com npm run start:dev:teste)" tom="aviso" icone="fa-flask">
          <p>
            Todas as ações desta tela funcionam, sem túnel e sem abrir o Asaas: pagar, vencer, liberar, repetir aviso e concluir ou falhar a
            transferência. Nada paga sozinho: o botão Pagar faz o papel de quem apoia. Reiniciar o Nest apaga a memória do provedor de
            teste. Para voltar ao Asaas: Ctrl+C e npm run start:dev.
          </p>
        </CaixaAviso>
      ) : (
        <CaixaAviso titulo={`Provedor de pagamento real: ${provedor}`} tom="aviso" icone="fa-triangle-exclamation">
          <p>
            Para usar as ações desta tela (pagar, vencer, liberar, concluir), inicie o Nest no modo rápido, no lugar do Asaas: Ctrl+C no
            terminal do Nest e npm run start:dev:teste (na pasta nest). Com o Asaas, só as tarefas automáticas funcionam aqui; pagar e
            vencer são feitos no painel do Asaas.
          </p>
        </CaixaAviso>
      )}

      <div className="admin-content-painel">
        <CardsTarefasAutomaticas
          auth={auth}
          provedorDeTeste={provedorDeTeste}
          intervalosMinutos={intervalosMinutos}
          rodando={rodando}
          aoErro={reportarErro}
          aoRodar={({ tarefa, rotulo }) => void agir(tarefa, () => bancadaPagamentoApi.rodar(chamar, tarefa), `${rotulo}: feito.`)}
        />
      </div>

      <div className="admin-content-painel">
        <GenericTable<ContribuicaoBancada>
          titulo="Contribuições"
          ajuda="As mais recentes. Contribua com Pix, cartão ou boleto e pague como o provedor; no cartão, o dinheiro só vai para repasse depois de liberado (a previsão é o parâmetro cartao_dias_liberacao). Reiniciar o Nest apaga a memória do provedor de teste: o Pix pendente vira 'perdido' e só vence sozinho."
          acaoTopo={
            <button type="button" className="btn btn-primary" onClick={() => setGerandoPix(true)}>
              <i className="fa-solid fa-hand-holding-dollar" aria-hidden="true"></i> Contribuir
            </button>
          }
          colunas={[
            { chave: 'idContribuicao', rotulo: 'id', tipo: 'id' },
            { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
            { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro' },
            { chave: 'taxaPagamento', rotulo: 'tarifa', tipo: 'dinheiro' },
            {
              chave: 'meioPagamento',
              rotulo: 'meio',
              tipo: 'texto',
              renderizar: rotuloMeio,
              textoExibido: rotuloMeio,
            },
            {
              chave: 'status',
              rotulo: 'status',
              tipo: 'status',
              renderizar: (linha) => <BadgeStatusContribuicao status={linha.status} />,
              textoExibido: (linha) => ROTULO_STATUS_CONTRIBUICAO[linha.status],
            },
            {
              chave: 'noProvedor',
              rotulo: 'no provedor',
              tipo: 'texto',
              renderizar: (linha) => rotuloNoProvedor(linha.noProvedor),
              textoExibido: (linha) => rotuloNoProvedor(linha.noProvedor),
            },
          ]}
          chavePrimaria="idContribuicao"
          listar={listarContribuicoes}
          chaveRecarga={chaveRecarga}
          acoes={{
            consultar: (linha) => setConsultando(linha),
            pagar: (linha) => void agir('pagar', () => bancadaPagamentoApi.pagar(chamar, linha.idContribuicao), `Contribuição #${linha.idContribuicao} paga.`),
            liberarDinheiro: (linha) =>
              void agir('liberar', () => bancadaPagamentoApi.liberar(chamar, linha.idContribuicao), `Dinheiro do cartão da contribuição #${linha.idContribuicao} liberado.`),
            vencer: (linha) => void agir('vencer', () => bancadaPagamentoApi.vencer(chamar, linha.idContribuicao), `Cobrança da contribuição #${linha.idContribuicao} vencida.`),
            repetirAviso: (linha) =>
              void agir('repetirAviso', () => bancadaPagamentoApi.repetirAviso(chamar, linha.idContribuicao), `Aviso da contribuição #${linha.idContribuicao} repetido.`),
          }}
          acaoIndisponivel={(linha, acao) => {
            // Consultar só lê: vale em qualquer modo e em qualquer situação.
            if (acao === 'consultar') return undefined;
            if (!provedorDeTeste) return 'Só com o provedor de teste.';
            if (linha.noProvedor === 'perdida') return 'O provedor de teste não conhece mais esta cobrança.';
            if (acao === 'repetirAviso') return linha.noProvedor === 'pendente' || linha.noProvedor === null ? 'O provedor ainda não mandou aviso desta cobrança.' : undefined;
            if (acao === 'liberarDinheiro') {
              if (linha.meioPagamento !== 'cartao_credito') return null;
              return linha.noProvedor === 'confirmada' && !linha.dinheiroLiberado ? undefined : 'Só um cartão pago e ainda não liberado.';
            }
            return linha.noProvedor === 'pendente' ? undefined : 'Só uma cobrança aguardando pagamento.';
          }}
          vazio={{ icone: 'fa-money-bill-wave', titulo: 'Nenhuma contribuição ainda.', texto: 'Use Contribuir para criar a primeira.' }}
        />

        <RegistroChamadas filtro={ehChamadaDeContribuicoes} />
      </div>

      <div className="admin-content-painel">
        <GenericTable<RepasseBancada>
          titulo="Repasses"
          ajuda="O dinheiro que vai para o pesquisador quando a campanha fecha. Sem chave Pix confirmada do dono, o repasse espera: entre como ele e use Minha chave Pix."
          acaoTopo={
            <button type="button" className="btn btn-secondary" onClick={() => setCadastrandoChave(true)}>
              <i className="fa-solid fa-key" aria-hidden="true"></i> Minha chave Pix
            </button>
          }
          colunas={[
            { chave: 'idRepasse', rotulo: 'id', tipo: 'id' },
            { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
            { chave: 'valorLiquido', rotulo: 'líquido', tipo: 'dinheiro' },
            {
              chave: 'status',
              rotulo: 'status',
              tipo: 'status',
              renderizar: (linha) => <BadgeStatusRepasse status={linha.status} aguardandoConta={linha.aguardandoConta} />,
              textoExibido: (linha) => rotuloSituacaoRepasse(linha.status, linha.aguardandoConta),
            },
            {
              chave: 'noProvedor',
              rotulo: 'no provedor',
              tipo: 'texto',
              renderizar: (linha) => rotuloNoProvedor(linha.noProvedor),
              textoExibido: (linha) => rotuloNoProvedor(linha.noProvedor),
            },
          ]}
          chavePrimaria="idRepasse"
          listar={listarRepasses}
          chaveRecarga={chaveRecarga}
          acoes={{
            concluirTransferencia: (linha) =>
              void agir('concluir', () => bancadaPagamentoApi.concluirTransferencia(chamar, linha.idRepasse), `Transferência do repasse #${linha.idRepasse} concluída.`),
            falharTransferencia: (linha) =>
              void agir('falhar', () => bancadaPagamentoApi.falharTransferencia(chamar, linha.idRepasse), `Transferência do repasse #${linha.idRepasse} falhou.`),
          }}
          acaoIndisponivel={(linha) => {
            if (!provedorDeTeste) return 'Só com o provedor de teste.';
            return linha.status === 'processando' && linha.noProvedor === 'processando' ? undefined : 'Só um repasse com transferência em andamento.';
          }}
          vazio={{ icone: 'fa-paper-plane', titulo: 'Nenhum repasse ainda.', texto: 'Feche uma campanha com contribuição paga.' }}
        />

        <RegistroChamadas filtro={ehChamadaDeRepasses} />
      </div>

      {consultando && (
        <ModalConsultarContribuicao authFetch={auth.authFetch} contribuicao={consultando} rotuloMeio={rotuloMeio(consultando)} aoFechar={() => setConsultando(null)} />
      )}
      {gerandoPix && <ModalGerarPix authFetch={auth.authFetch} chamar={chamar} aoFechar={() => setGerandoPix(false)} aoGerado={recarregar} />}
      {cadastrandoChave && <ModalChavePix chamar={chamar} aoFechar={() => setCadastrandoChave(false)} aoCadastrada={recarregar} />}
    </>
  );
}
