import { useCallback, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { LayoutAreaUsuario } from '../../components/layout/layout-area-usuario';
import { AvisoSoPesquisador } from '../../components/crud/aviso-so-pesquisador';
import { BotaoCriar } from '../../components/crud/botao-criar';
import { GenericTable } from '../../components/crud/generic-table';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ListaAnexos } from '../../components/crud/lista-anexos';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { ModalExcluirComentario } from '../../components/crud/modal-excluir-comentario';
import { CartaoEndosso } from './cartao-endosso';
import { denunciaApi } from '../../services/19-denuncia/api/denuncia.api';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { SecaoGanhadoresRecompensa } from '../18-recompensa/secao-ganhadores-recompensa';
import { ModalExcluirItem } from '../../components/crud/modal-excluir-item';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  ORDEM_ROTULOS_STATUS_CAMPANHA,
  STATUS_ACEITA_ATUALIZACAO,
  rotuloStatusCampanha,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { useSituacaoPesquisador } from '../../services/6-perfil-pesquisador/hook/use-situacao-pesquisador';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import { comentarioApi } from '../../services/17-comentario/api/comentario.api';
import type { ComentarioResponse } from '../../services/17-comentario/type/comentario.type';
import { ROTULO_FASE_ATUALIZACAO, ROTULO_TIPO_ATUALIZACAO, rotuloSituacaoAtualizacao } from '../../services/15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import { ROTULO_TIPO_RECOMPENSA } from '../../services/18-recompensa/constants/recompensa.constants';
import type { RecompensaResponse } from '../../services/18-recompensa/type/recompensa.type';
import { contribuicaoApi } from '../../services/22-contribuicao/api/contribuicao.api';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import { classeBadgeStatusContribuicao, ROTULO_STATUS_CONTRIBUICAO } from '../../services/22-contribuicao/constants/status-contribuicao.constants';
import type { ContribuicaoRecebida } from '../../services/22-contribuicao/type/contribuicao.type';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { contaRecebimentoApi } from '../../services/24-conta-recebimento/api/conta-recebimento.api';
import type { RepasseResponse } from '../../services/24-conta-recebimento/type/conta-recebimento.type';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { renderizarArrecadado, renderizarStatus, textoStatus } from '../12-campanha/colunas-campanha';
import { ModalAlterarCampanha } from '../12-campanha/modal-alterar-campanha';
import { ModalConsultarCampanha } from '../12-campanha/modal-consultar-campanha';
import { ModalCriarCampanha } from '../12-campanha/modal-criar-campanha';
import { ModalExcluirCampanha } from '../12-campanha/modal-excluir-campanha';
import { ModalRecompensa } from '../18-recompensa/modal-recompensa';
import { ModalAtualizacao } from '../15-atualizacao-campanha/modal-atualizacao';
import { ModalExcluirAtualizacao } from '../15-atualizacao-campanha/modal-excluir-atualizacao';

type SecaoEstudio = 'campanhas' | 'recompensas' | 'atualizacoes' | 'comentarios' | 'contribuicoes';

const SECOES: { chave: SecaoEstudio; rotulo: string; icone: string }[] = [
  { chave: 'campanhas', rotulo: 'Campanhas', icone: 'fa-flask' },
  { chave: 'recompensas', rotulo: 'Recompensas', icone: 'fa-gift' },
  { chave: 'atualizacoes', rotulo: 'Atualizações', icone: 'fa-arrows-rotate' },
  { chave: 'comentarios', rotulo: 'Comentários', icone: 'fa-comments' },
  { chave: 'contribuicoes', rotulo: 'Contribuições', icone: 'fa-hand-holding-heart' },
];

function ehSecaoEstudio(valor: string | undefined): valor is SecaoEstudio {
  return SECOES.some(({ chave }) => chave === valor);
}

export function EstudioPesquisador({ auth }: PropsPagina) {
  const { secao } = useParams();
  if (auth.carregando) return null;
  if (!auth.usuario) return <Navigate to="/login" replace state={{ voltarPara: '/estudio-pesquisador' }} />;
  if (!auth.usuario.ehPesquisador) {
    return (
      <main className="largura-site w-full max-w-3xl mx-auto px-4 py-8">
        <h1 className="titulo-pagina texto-forte mb-5">Estúdio do pesquisador</h1>
        <AvisoSoPesquisador
          situacao="sem-perfil"
          fazem="com perfil de pesquisador têm acesso ao estúdio"
          fazer="acessar o estúdio"
        />
      </main>
    );
  }
  if (secao === undefined || !ehSecaoEstudio(secao)) {
    return <Navigate to="/estudio-pesquisador/campanhas" replace />;
  }
  return <ConteudoEstudio auth={auth} secao={secao} />;
}

function ConteudoEstudio({ auth, secao }: PropsPagina & { secao: SecaoEstudio }) {
  const idUsuario = auth.usuario?.idUsuario ?? null;
  const buscarCampanhas = useCallback(
    () => idUsuario === null
      ? Promise.resolve<CampanhaResponse[]>([])
      : campanhaApi.listar(auth.authFetch, { idUsuario }),
    [auth.authFetch, idUsuario],
  );
  const { dado: campanhas, carregando, erro, recarregar } = useBuscar(
    buscarCampanhas,
    [auth.authFetch, idUsuario],
    { mostraTexto: true },
  );
  const statusPesquisador = useSituacaoPesquisador(auth.authFetch, auth.usuario);

  return (
    <LayoutAreaUsuario
      titulo="Estúdio do pesquisador"
      descricao="Gerencie suas campanhas, recompensas, atualizações, comentários e acompanhe os apoios recebidos."
      rotuloMenu="Seções do estúdio"
      itens={SECOES.map((item) => ({ to: `/estudio-pesquisador/${item.chave}`, rotulo: item.rotulo, icone: item.icone }))}
    >
          {statusPesquisador !== null && statusPesquisador !== 'ativo' && (
            <div className="mb-5 rounded-lg border borda-aviso fundo-aviso p-4">
              <p className="paragrafo texto-herdado">
                {statusPesquisador === 'suspenso'
                  ? 'Seu perfil de pesquisador está suspenso.'
                  : 'Esta conta não possui um perfil de pesquisador ativo.'}
                {' '}Você pode acompanhar seus dados; ações restritas continuam sujeitas às regras da plataforma.
              </p>
            </div>
          )}
          {carregando ? (
            <p className="paragrafo texto-fraco" role="status">Carregando campanhas...</p>
          ) : campanhas === null ? (
            <div className="space-y-3">
              <MensagemErro texto={erro} />
              <button type="button" className="btn btn-secondary" onClick={recarregar}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {secao === 'campanhas' && (
                <PainelCampanhas
                  auth={auth}
                  campanhas={campanhas}
                  statusPesquisador={statusPesquisador}
                  aoMudarCampanhas={recarregar}
                />
              )}
              {secao === 'recompensas' && <PainelRecompensas auth={auth} campanhas={campanhas} />}
              {secao === 'atualizacoes' && <PainelAtualizacoes auth={auth} campanhas={campanhas} />}
              {secao === 'comentarios' && <PainelComentarios auth={auth} campanhas={campanhas} />}
              {secao === 'contribuicoes' && <PainelContribuicoes auth={auth} campanhas={campanhas} />}
            </>
          )}
    </LayoutAreaUsuario>
  );
}

interface CampanhaLinha extends Omit<CampanhaResponse, 'status'> {
  status: string;
  statusOriginal: CampanhaResponse['status'];
  // RF-090/091: métricas da lista "Projetos Criados". Doadores, líquido (estimado ou repassado) e taxa retida ficam no Consultar.
  // O repasse concluído da campanha: vai para o Consultar (Repassado, Taxa retida).
  repasse: RepasseResponse | null;
}

// Campanha que já terminou (bloco "Campanhas encerradas" do Estúdio).
const STATUS_ENCERRADA: ReadonlySet<CampanhaResponse['status']> = new Set(['sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao']);

async function montarLinhasCampanhas(
  authFetch: PropsPagina['auth']['authFetch'],
  campanhas: CampanhaResponse[],
): Promise<CampanhaLinha[]> {
  // Repasse só existe em campanha encerrada; falhar a consulta não derruba a lista (o líquido cai no estimado).
  const repassePorCampanha = new Map<number, RepasseResponse>();
  if (campanhas.some((campanha) => STATUS_ENCERRADA.has(campanha.status))) {
    const repasses = await contaRecebimentoApi.listarRepasses(authFetch).catch(() => [] as RepasseResponse[]);
    for (const repasse of repasses) {
      if (repasse.status === 'concluido') repassePorCampanha.set(repasse.idCampanha, repasse);
    }
  }

  return campanhas.map((campanha) => {
    const repasse = repassePorCampanha.get(campanha.idCampanha) ?? null;
    return {
      ...campanha,
      status: rotuloStatusCampanha(campanha),
      statusOriginal: campanha.status,
      repasse,
    };
  });
}

function PainelCampanhas({
  auth,
  campanhas,
  statusPesquisador,
  aoMudarCampanhas,
}: {
  auth: PropsPagina['auth'];
  campanhas: CampanhaResponse[];
  statusPesquisador: ReturnType<typeof useSituacaoPesquisador>;
  aoMudarCampanhas: () => void;
}) {
  const {
    criando, abrirCriando, fecharCriando, alterando, consultando, excluindo,
    fecharAlterando, fecharConsultando, fecharExcluindo, chaveRecarga, recarregar, acoesCompletas,
  } = useCrudModais<CampanhaLinha>();
  // Dois blocos (Lucas e Alexia, 14-11-2026): Ativas e Encerradas. Rascunho, em análise e rejeitada ficam nas
  // Ativas "por enquanto", apagadas (ainda não estão no ar). Colunas enxutas: id, vídeo, lançamento, meta e modalidade
  // saíram (estão no Consultar); a meta já aparece no % e na barra do arrecadado.
  const campanhasAtivas = useMemo(() => campanhas.filter((campanha) => !STATUS_ENCERRADA.has(campanha.status)), [campanhas]);
  const campanhasEncerradas = useMemo(() => campanhas.filter((campanha) => STATUS_ENCERRADA.has(campanha.status)), [campanhas]);
  const listarAtivas = useCallback(
    (): Promise<CampanhaLinha[]> => montarLinhasCampanhas(auth.authFetch, campanhasAtivas),
    [auth.authFetch, campanhasAtivas],
  );
  const listarEncerradas = useCallback(
    (): Promise<CampanhaLinha[]> => montarLinhasCampanhas(auth.authFetch, campanhasEncerradas),
    [auth.authFetch, campanhasEncerradas],
  );
  const podeCriar = statusPesquisador === 'ativo';
  const mudou = () => {
    recarregar();
    aoMudarCampanhas();
  };

  const colunaCampanha = { chave: 'titulo', rotulo: 'campanha', tipo: 'nome', umaLinha: true } as const;
  const colunaSituacao = { chave: 'status', rotulo: 'situação', tipo: 'status', renderizar: renderizarStatus, textoExibido: textoStatus } as const;
  const colunasDinheiro = [
    { chave: 'valorBrutoArrecadado', rotulo: 'arrecadado', tipo: 'dinheiro', renderizar: renderizarArrecadado },
    { chave: 'metaFinanceira', rotulo: 'meta', tipo: 'dinheiro', rotuloCentralizado: true },
  ] as const;

  return (
    <>
      <GenericTable<CampanhaLinha>
        titulo="Campanhas ativas"
        nivelTitulo={2}
        ajuda={`No ar e em captação. Rascunhos, campanhas em análise e rejeitadas aparecem aqui mais apagadas, porque ainda não estão no ar. Doadores, valor líquido, repasse e taxa retida: em Consultar.`}
        acaoTopo={podeCriar && <BotaoCriar rotulo="Nova campanha" aoClicar={abrirCriando} />}
        colunas={[
          colunaCampanha,
          colunaSituacao,
          ...colunasDinheiro,
        ]}
        chavePrimaria="idCampanha"
        listar={listarAtivas}
        grupoAlinhamento="estudio-campanhas"
        chaveRecarga={chaveRecarga}
        acoes={acoesCompletas}
        linhaApagada={(linha) => linha.statusOriginal !== 'ativo'}
        filtrosFacetados={[{ chave: 'status', rotulo: 'Situação', ordem: ORDEM_ROTULOS_STATUS_CAMPANHA }]}
        vazio={{
          icone: 'fa-flask',
          titulo: 'Nenhuma campanha ativa.',
          texto: podeCriar
            ? 'Crie uma campanha para começar a compartilhar sua pesquisa.'
            : 'Campanhas são criadas por pesquisadores com perfil ativo.',
        }}
      />
      <div className="mt-10">
        <GenericTable<CampanhaLinha>
          titulo="Campanhas encerradas"
          nivelTitulo={2}
          ajuda={`Campanhas que já terminaram: com sucesso, sem atingir a meta, encerradas antes do prazo ou pela moderação. Doadores, valor líquido, repasse e taxa retida: em Consultar.`}
          colunas={[
            colunaCampanha,
            colunaSituacao,
            ...colunasDinheiro,
          ]}
          chavePrimaria="idCampanha"
          listar={listarEncerradas}
          grupoAlinhamento="estudio-campanhas"
          chaveRecarga={chaveRecarga}
          acoes={acoesCompletas}
          filtrosFacetados={[{ chave: 'status', rotulo: 'Situação', ordem: ORDEM_ROTULOS_STATUS_CAMPANHA }]}
          vazio={{ icone: 'fa-flag-checkered', titulo: 'Nenhuma campanha encerrada ainda.' }}
        />
      </div>
      {criando && <ModalCriarCampanha auth={auth} comRecompensas aoMudar={mudou} aoFechar={fecharCriando} />}
      {alterando?.statusOriginal === 'rascunho' && (
        <ModalCriarCampanha auth={auth} idRascunho={alterando.idCampanha} comRecompensas aoMudar={mudou} aoFechar={fecharAlterando} />
      )}
      {alterando && alterando.statusOriginal !== 'rascunho' && (
        <ModalAlterarCampanha auth={auth} idCampanha={alterando.idCampanha} ehDono aoMudar={mudou} aoFechar={fecharAlterando} />
      )}
      {consultando && (
        <ModalConsultarCampanha auth={auth} idCampanha={consultando.idCampanha} comoDono repasse={consultando.repasse} aoFechar={fecharConsultando} />
      )}
      {excluindo && (
        <ModalExcluirCampanha
          auth={auth}
          campanha={{ ...excluindo, status: excluindo.statusOriginal }}
          aoExcluida={mudou}
          aoFechar={fecharExcluindo}
        />
      )}
    </>
  );
}

interface RecompensaLinha extends RecompensaResponse {
  tituloCampanha: string;
  tipoRotulo: string;
  situacao: string;
}

function PainelRecompensas({ auth, campanhas }: { auth: PropsPagina['auth']; campanhas: CampanhaResponse[] }) {
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const [editando, setEditando] = useState<{ campanha: number; recompensa?: RecompensaResponse } | null>(null);
  const [consultando, setConsultando] = useState<RecompensaLinha | null>(null);
  const [excluindo, setExcluindo] = useState<RecompensaLinha | null>(null);
  const listar = useCallback(async (): Promise<RecompensaLinha[]> => {
    const listas = await Promise.all(campanhas.map(async (campanha) => {
      const recompensas = await recompensaApi.listar(auth.authFetch, campanha.idCampanha);
      return recompensas.map((recompensa) => ({
        ...recompensa,
        tituloCampanha: campanha.titulo,
        tipoRotulo: ROTULO_TIPO_RECOMPENSA[recompensa.tipo],
        situacao: recompensa.ativo ? 'Ativa' : 'Desativada',
      }));
    }));
    return listas.flat();
  }, [auth.authFetch, campanhas]);
  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  return (
    <>
      <GenericTable<RecompensaLinha>
        titulo="Recompensas"
        nivelTitulo={2}
        ajuda="Ofereça reconhecimento, acesso antecipado ou conteúdo digital às pessoas que apoiarem."
        acaoTopo={campanhas.length > 0 && (
          <BotaoCriar rotulo="Nova recompensa" aoClicar={() => setEditando({ campanha: campanhas[0].idCampanha })} />
        )}
        colunas={[
          { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'titulo', rotulo: 'recompensa', tipo: 'nome', umaLinha: true },
          { chave: 'tipoRotulo', rotulo: 'tipo', tipo: 'texto' },
          { chave: 'valorMinimo', rotulo: 'a partir de', tipo: 'dinheiro' },
          {
            chave: 'situacao',
            rotulo: 'situação',
            tipo: 'status',
            // Só o selo: desativar e reativar ficam no Alterar; quantas vezes foi concedida, no Consultar.
            renderizar: (linha) => <span className={'badge ' + (linha.ativo ? 'badge-sucesso' : 'badge-neutro')}>{linha.situacao}</span>,
            textoExibido: (linha) => linha.situacao,
          },
        ]}
        chavePrimaria="idRecompensa"
        listar={listar}
        chaveRecarga={chaveRecarga}
        acoes={{
          consultar: setConsultando,
          alterar: (linha) => setEditando({ campanha: linha.idCampanha, recompensa: linha }),
          excluir: setExcluindo,
        }}
        acaoIndisponivel={(linha, acao) =>
          acao === 'excluir' && linha.escolhidas > 0
            ? 'Já foi concedida a quem apoiou: não pode ser excluída. Para tirá-la do ar, desative em Alterar.'
            : undefined
        }
        filtrosFacetados={[
          { chave: 'tipoRotulo', rotulo: 'Tipo' },
          { chave: 'situacao', rotulo: 'Situação' },
        ]}
        vazio={{
          icone: 'fa-gift',
          titulo: campanhas.length ? 'Nenhuma recompensa cadastrada.' : 'Cadastre uma campanha antes de oferecer recompensas.',
          texto: campanhas.length ? 'Cadastre recompensas simbólicas para suas campanhas.' : undefined,
        }}
      />
      {consultando && (
        <ModalFicha titulo="Consultar Recompensa" subtitulo={consultando.titulo} aoFechar={() => setConsultando(null)}>
          <SecaoFicha titulo="Recompensa">
            <CampoFicha rotulo="Campanha" valor={consultando.tituloCampanha} largura="cheia" />
            <CampoFicha rotulo="Tipo" valor={consultando.tipoRotulo} />
            <CampoFicha rotulo="A partir de" valor={formatarMoeda(consultando.valorMinimo)} />
            <CampoFicha rotulo="Situação" valor={consultando.situacao} />
            <CampoFicha rotulo="Descrição" valor={consultando.descricao} largura="cheia" />
            {consultando.links.length > 0 && (
              <CampoFicha
                rotulo="Link especial"
                valor={<a href={consultando.links[0].url} target="_blank" rel="noreferrer" className="link-texto break-all">{consultando.links[0].url}</a>}
                largura="cheia"
              />
            )}
          </SecaoFicha>
          <SecaoGanhadoresRecompensa authFetch={auth.authFetch} idRecompensa={consultando.idRecompensa} />
        </ModalFicha>
      )}
      {excluindo && (
        <ModalExcluirItem
          nome={excluindo.titulo}
          campos={
            <>
              <CampoFicha rotulo="Campanha" valor={excluindo.tituloCampanha} largura="cheia" />
              <CampoFicha rotulo="Tipo" valor={excluindo.tipoRotulo} />
              <CampoFicha rotulo="A partir de" valor={formatarMoeda(excluindo.valorMinimo)} />
            </>
          }
          remover={() => recompensaApi.excluir(auth.authFetch, excluindo.idRecompensa)}
          mensagemSucesso="Recompensa excluída."
          aoFechar={() => setExcluindo(null)}
          aoExcluido={recarregar}
        />
      )}
      {editando && (
        <ModalRecompensa
          auth={auth}
          idCampanha={editando.campanha}
          recompensa={editando.recompensa}
          campanhasParaEscolher={campanhas}
          aoFechar={() => setEditando(null)}
          aoSalva={recarregar}
        />
      )}
    </>
  );
}

interface AtualizacaoLinha extends AtualizacaoCampanhaResponse {
  tituloCampanha: string;
  faseRotulo: string;
  tipoRotulo: string;
  situacao: string;
}

function PainelAtualizacoes({ auth, campanhas }: { auth: PropsPagina['auth']; campanhas: CampanhaResponse[] }) {
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const [editando, setEditando] = useState<{ campanha: number; atualizacao?: AtualizacaoCampanhaResponse } | null>(null);
  const [excluindo, setExcluindo] = useState<AtualizacaoCampanhaResponse | null>(null);
  const [consultando, setConsultando] = useState<AtualizacaoLinha | null>(null);
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();
  const { executar } = useEnvio(reportarErro);
  const campanhasPublicaveis = campanhas.filter((campanha) => STATUS_ACEITA_ATUALIZACAO.has(campanha.status));
  const listar = useCallback(async (): Promise<AtualizacaoLinha[]> => {
    const listas = await Promise.all(campanhas.map(async (campanha) => {
      const atualizacoes = await atualizacaoCampanhaApi.listar(auth.authFetch, campanha.idCampanha);
      return atualizacoes.map((atualizacao) => ({
        ...atualizacao,
        tituloCampanha: campanha.titulo,
        faseRotulo: ROTULO_FASE_ATUALIZACAO[atualizacao.fase],
        tipoRotulo: ROTULO_TIPO_ATUALIZACAO[atualizacao.tipo],
        situacao: rotuloSituacaoAtualizacao(atualizacao, true),
      }));
    }));
    return listas.flat();
  }, [auth.authFetch, campanhas]);
  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  return (
    <>
      <GenericTable<AtualizacaoLinha>
        titulo="Atualizações"
        nivelTitulo={2}
        ajuda="Publique o andamento da pesquisa e registre resultados para quem acompanha suas campanhas."
        acaoTopo={campanhasPublicaveis.length > 0 && (
          <BotaoCriar rotulo="Nova atualização" aoClicar={() => setEditando({ campanha: campanhasPublicaveis[0].idCampanha })} />
        )}
        colunas={[
          { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'titulo', rotulo: 'título', tipo: 'nome', umaLinha: true },
          { chave: 'faseRotulo', rotulo: 'fase', tipo: 'texto' },
          { chave: 'tipoRotulo', rotulo: 'formato', tipo: 'texto' },
          { chave: 'publicadoEm', rotulo: 'publicada em', tipo: 'dataHora' },
          {
            chave: 'situacao',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha) => (
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className={'badge ' + (linha.ativo ? 'badge-sucesso' : linha.ocultadaModeracao ? 'badge-erro' : 'badge-neutro')}>
                  {linha.situacao}
                </span>
                {!linha.ativo && !linha.ocultadaModeracao && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-pequeno"
                    onClick={() => void executar(async () => {
                      await atualizacaoCampanhaApi.alterar(auth.authFetch, linha.idAtualizacao, { ativo: true });
                      mostrar('Atualização reativada.');
                      recarregar();
                    })}
                  >
                    Reativar
                  </button>
                )}
              </div>
            ),
            textoExibido: (linha) => linha.situacao,
          },
        ]}
        chavePrimaria="idAtualizacao"
        listar={listar}
        chaveRecarga={chaveRecarga}
        acoes={{
          alterar: (linha) => setEditando({ campanha: linha.idCampanha, atualizacao: linha }),
          consultar: setConsultando,
          excluir: (linha) => setExcluindo(linha),
        }}
        acaoIndisponivel={(linha, acao) => (
          acao === 'excluir' && !linha.ativo
            ? linha.ocultadaModeracao ? 'Excluída pela moderação.' : 'Esta atualização já foi ocultada.'
            : undefined
        )}
        filtrosFacetados={[
          { chave: 'faseRotulo', rotulo: 'Fase' },
          { chave: 'situacao', rotulo: 'Situação' },
        ]}
        vazio={{
          icone: 'fa-arrows-rotate',
          titulo: campanhas.length ? 'Nenhuma atualização publicada.' : 'Cadastre uma campanha para publicar atualizações.',
          texto: campanhas.length && campanhasPublicaveis.length === 0
            ? 'Atualizações podem ser publicadas em campanhas aprovadas e publicadas.'
            : 'Compartilhe o progresso e os resultados das suas pesquisas.',
        }}
      />
      {editando && (
        <ModalAtualizacao
          auth={auth}
          idCampanha={editando.campanha}
          atualizacao={editando.atualizacao}
          campanhasParaEscolher={campanhasPublicaveis}
          aoFechar={() => setEditando(null)}
          aoSalva={recarregar}
        />
      )}
      {excluindo && (
        <ModalExcluirAtualizacao
          authFetch={auth.authFetch}
          atualizacao={excluindo}
          situacao={rotuloSituacaoAtualizacao(excluindo, true)}
          aoFechar={() => setExcluindo(null)}
          aoExcluida={recarregar}
        />
      )}
      {consultando && (
        <ModalFicha
          titulo={consultando.titulo}
          subtitulo={consultando.tituloCampanha}
          aoFechar={() => setConsultando(null)}
          rodape={<RodapeAcoes aoCancelar={() => setConsultando(null)} rotuloCancelar="Fechar" />}
        >
          <div className="grade-ficha">
            <CampoFicha rotulo="Fase" valor={consultando.faseRotulo} />
            <CampoFicha rotulo="Formato" valor={consultando.tipoRotulo} />
            <CampoFicha rotulo="Publicada em" valor={formatarDataHora(consultando.publicadoEm)} />
            <CampoFicha rotulo="Situação" valor={consultando.situacao} />
            <CampoFicha rotulo="Conteúdo" valor={consultando.conteudo} largura="cheia" />
            <CampoFicha rotulo="Anexos" valor={<ListaAnexos anexos={consultando.anexos} />} largura="cheia" />
          </div>
        </ModalFicha>
      )}
    </>
  );
}

interface ComentarioLinha extends ComentarioResponse {
  tituloCampanha: string;
  autor: string;
  endosso: string;
  endossosAtivos: number;
}

const TAMANHO_PAGINA_COMENTARIOS = 500;

async function listarComentariosDaCampanha(authFetch: PropsPagina['auth']['authFetch'], idCampanha: number) {
  const primeiraPagina = await comentarioApi.listarPagina(authFetch, idCampanha, 1, TAMANHO_PAGINA_COMENTARIOS);
  const totalPaginas = Math.ceil(primeiraPagina.total / TAMANHO_PAGINA_COMENTARIOS);
  const outrasPaginas = await Promise.all(
    Array.from({ length: Math.max(0, totalPaginas - 1) }, (_, indice) =>
      comentarioApi.listarPagina(authFetch, idCampanha, indice + 2, TAMANHO_PAGINA_COMENTARIOS),
    ),
  );
  return [...primeiraPagina.dados, ...outrasPaginas.flatMap((pagina) => pagina.dados)];
}

function PainelComentarios({ auth, campanhas }: { auth: PropsPagina['auth']; campanhas: CampanhaResponse[] }) {
  const limiteEndossos = useConfiguracoes().obterNumero('limite_endossos_campanha', 4);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const [excluindo, setExcluindo] = useState<ComentarioLinha | null>(null);
  const [consultando, setConsultando] = useState<ComentarioLinha | null>(null);
  const [alterando, setAlterando] = useState<ComentarioLinha | null>(null);
  const listar = useCallback(async (): Promise<ComentarioLinha[]> => {
    const listas = await Promise.all(campanhas.map(async (campanha) => {
      const comentarios = await listarComentariosDaCampanha(auth.authFetch, campanha.idCampanha);
      const endossosAtivos = comentarios.filter((comentario) => comentario.endossado && comentario.ativo).length;
      return comentarios.map((comentario) => ({
        ...comentario,
        tituloCampanha: campanha.titulo,
        autor: comentario.nomePesquisador ?? 'Pesquisador removido',
        // Sem endosso: só um traço ("pendente" prometia um endosso que quase nunca vem).
        endosso: comentario.endossado ? `Endossado (#${comentario.ordemEndosso ?? '—'})` : '-',
        endossosAtivos,
      }));
    }));
    return listas.flat();
  }, [auth.authFetch, campanhas]);
  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  return (
    <>
      <div className="estudio-comentarios">
        <GenericTable<ComentarioLinha>
          titulo="Comentários"
          nivelTitulo={2}
          ajuda={`Consulte os comentários recebidos e escolha até ${limiteEndossos} por campanha para endossar.`}
          colunas={[
            { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
            { chave: 'autor', rotulo: 'apoiador', tipo: 'nome', umaLinha: true },
            { chave: 'criadoEm', rotulo: 'data', tipo: 'data' },
            { chave: 'conteudo', rotulo: 'comentário', tipo: 'texto', umaLinha: true },
            {
              chave: 'endosso',
              rotulo: 'endosso',
              tipo: 'status',
              renderizar: (linha) => (linha.endossado ? <span className="badge badge-sucesso">{linha.endosso}</span> : '-'),
              textoExibido: (linha) => linha.endosso,
            }
          ]}
          chavePrimaria="idComentario"
          listar={listar}
          chaveRecarga={chaveRecarga}
          // Endossar e tirar o endosso ficam no Alterar (como na maioria dos sistemas), com a prévia do cartão.
          acoes={{ consultar: setConsultando, alterar: setAlterando, excluir: setExcluindo }}
          filtrosFacetados={[
            { chave: 'endosso', rotulo: 'Endosso' },
          ]}
          vazio={{
            icone: 'fa-comments',
            titulo: campanhas.length ? 'Nenhum comentário recebido.' : 'Cadastre uma campanha para receber comentários.',
            texto: 'Os comentários das campanhas aparecerão aqui. Para endossar, use Alterar.',
          }}
        />
      </div>
      {consultando && (
        <ModalFicha titulo={`Comentário de ${consultando.autor}`} subtitulo={consultando.tituloCampanha} aoFechar={() => setConsultando(null)} rodape={<RodapeAcoes aoCancelar={() => setConsultando(null)} rotuloCancelar="Fechar" />}>
          <div className="grade-ficha">
            <CampoFicha rotulo="Autor" valor={consultando.autor} />
            <CampoFicha rotulo="Enviado em" valor={formatarDataHora(consultando.criadoEm)} />
            <CampoFicha rotulo="Endosso" valor={consultando.endosso} />
            <CampoFicha rotulo="Comentário" valor={consultando.conteudo} largura="cheia" />
          </div>
        </ModalFicha>
      )}
      {alterando && (
        <ModalEndossoComentario
          auth={auth}
          comentario={alterando}
          limiteEndossos={limiteEndossos}
          aoFechar={() => setAlterando(null)}
          aoSalvo={recarregar}
        />
      )}
      {excluindo && (
        <ModalExcluirComentario
          autor={excluindo.autor}
          conteudo={excluindo.conteudo}
          excluir={(bloquear) => bloquear
            ? comentarioApi.bloquear(auth.authFetch, excluindo.idComentario).then(() => undefined)
            : comentarioApi.excluir(auth.authFetch, excluindo.idComentario)}
          denunciar={(idMotivo) => denunciaApi.criar(auth.authFetch, { idComentario: excluindo.idComentario, idMotivo }).then(() => undefined)}
          aoFechar={() => setExcluindo(null)}
          aoExcluido={recarregar}
        />
      )}
    </>
  );
}

// Alterar um comentário recebido = decidir o endosso (o texto é do autor e não muda aqui). A prévia mostra o cartão
// exatamente como aparece no bloco Endosso da página da campanha.
function ModalEndossoComentario({
  auth,
  comentario,
  limiteEndossos,
  aoFechar,
  aoSalvo,
}: {
  auth: PropsPagina['auth'];
  comentario: ComentarioLinha;
  limiteEndossos: number;
  aoFechar: () => void;
  aoSalvo: () => void;
}) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const [endossado, setEndossado] = useState(comentario.endossado);
  const limiteAtingido = !comentario.endossado && comentario.endossosAtivos >= limiteEndossos;
  const mudou = endossado !== comentario.endossado;

  const salvar = () => void executar(async () => {
    if (mudou) {
      await comentarioApi.alternarEndosso(auth.authFetch, comentario.idComentario, endossado);
      mostrar(endossado ? 'Comentário endossado.' : 'Endosso removido.');
      aoSalvo();
    }
    aoFechar();
  });

  return (
    <ModalFicha
      titulo="Alterar Comentário"
      subtitulo={comentario.tituloCampanha}
      aoFechar={aoFechar}
      erro={erro}
      rodape={<RodapeAcoes aoCancelar={aoFechar} acao={{ rotulo: 'Salvar', rotuloOcupado: 'Salvando...', ocupado, aoClicar: salvar }} />}
    >
      <div className="space-y-5">
        <label className={`flex items-start gap-3 paragrafo texto-padrao ${limiteAtingido ? 'opacity-60' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={endossado}
            disabled={limiteAtingido || ocupado}
            onChange={(evento) => setEndossado(evento.target.checked)}
            className="mt-1 w-4 h-4 accent-primary"
          />
          <span>
            <span className="enfase texto-forte">Endossar este comentário</span>
            <span className="block legenda texto-fraco">
              {limiteAtingido
                ? `Esta campanha já tem ${limiteEndossos} comentários endossados (o limite). Tire o endosso de outro para endossar este.`
                : `Endossado, ele aparece no bloco Endosso da página da campanha (até ${limiteEndossos} por campanha).`}
            </span>
          </span>
        </label>
        <div>
          <p className="rotulo mb-2">{endossado ? 'Prévia na página da campanha' : 'Comentário (não aparece na página da campanha)'}</p>
          <div className={endossado ? undefined : 'opacity-60'}>
            <CartaoEndosso
              nome={comentario.nomePesquisador}
              foto={comentario.fotoPesquisador}
              idPesquisador={comentario.idPesquisador}
              conteudo={comentario.conteudo}
              previa
            />
          </div>
        </div>
      </div>
    </ModalFicha>
  );
}

function PainelContribuicoes({ auth, campanhas }: { auth: PropsPagina['auth']; campanhas: CampanhaResponse[] }) {
  const [consultandoId, setConsultandoId] = useState<number | null>(null);
  const listar = useCallback(
    () => contribuicaoApi.recebidas(auth.authFetch),
    [auth.authFetch],
  );

  return (
    <>
      <GenericTable<ContribuicaoRecebida>
        titulo="Contribuições"
        nivelTitulo={2}
        ajuda="Acompanhe o valor, a situação e a recompensa de cada apoio recebido."
        colunas={[
          { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'apoiador', rotulo: 'apoiador', tipo: 'nome', umaLinha: true },
          { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro' },
          {
            chave: 'status',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha) => (
              <span className={classeBadgeStatusContribuicao(linha.status)}>
                {ROTULO_STATUS_CONTRIBUICAO[linha.status]}
              </span>
            ),
            textoExibido: (linha) => ROTULO_STATUS_CONTRIBUICAO[linha.status],
          },
          {
            chave: 'meioPagamento',
            rotulo: 'meio',
            tipo: 'texto',
            renderizar: (linha) => <span>{ROTULO_MEIO_PAGAMENTO[linha.meioPagamento]}</span>,
            textoExibido: (linha) => ROTULO_MEIO_PAGAMENTO[linha.meioPagamento],
          },
          { chave: 'criadoEm', rotulo: 'data', tipo: 'dataHora' },
          { chave: 'recompensas', rotulo: 'recompensas', tipo: 'texto' },
        ]}
        chavePrimaria="idContribuicao"
        listar={listar}
        acoes={{ consultar: (linha) => setConsultandoId(linha.idCampanha) }}
        filtrosFacetados={[{
          chave: 'status',
          rotulo: 'Situação',
          ordem: Object.keys(ROTULO_STATUS_CONTRIBUICAO),
          rotulos: ROTULO_STATUS_CONTRIBUICAO,
        }]}
        vazio={{
          icone: 'fa-hand-holding-heart',
          titulo: campanhas.length ? 'Nenhuma contribuição recebida.' : 'Cadastre uma campanha para receber contribuições.',
        }}
      />
      {consultandoId !== null && (
        <ModalConsultarCampanha
          auth={auth}
          idCampanha={consultandoId}
          comoDono
          aoFechar={() => setConsultandoId(null)}
        />
      )}
    </>
  );
}
