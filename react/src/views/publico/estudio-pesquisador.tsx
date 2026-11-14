import { useCallback, useState } from 'react';
import { Navigate } from 'react-router';
import { AvisoSoPesquisador } from '../../components/crud/aviso-so-pesquisador';
import { BotaoCriar } from '../../components/crud/botao-criar';
import { GenericTable } from '../../components/crud/generic-table';
import { CampoFicha } from '../../components/crud/ficha-consulta';
import { ListaAnexos } from '../../components/crud/lista-anexos';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { ModalExcluirComentario } from '../../components/crud/modal-excluir-comentario';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  ORDEM_ROTULOS_STATUS_CAMPANHA,
  ROTULO_MODELO_CAMPANHA,
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
import { renderizarArrecadado, renderizarStatus, textoStatus } from '../12-campanha/colunas-campanha';
import { ModalAlterarCampanha } from '../12-campanha/modal-alterar-campanha';
import { ModalConsultarCampanha } from '../12-campanha/modal-consultar-campanha';
import { ModalCriarCampanha } from './modal-criar-campanha-publico';
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

export function EstudioPesquisador({ auth }: PropsPagina) {
  if (auth.carregando) return null;
  if (!auth.usuario) return <Navigate to="/login" replace />;
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
  return <ConteudoEstudio auth={auth} />;
}

function ConteudoEstudio({ auth }: PropsPagina) {
  const [secao, setSecao] = useState<SecaoEstudio>('campanhas');
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
    <div className="largura-site w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="titulo-pagina texto-forte">Estúdio do pesquisador</h1>
        <p className="mt-2 paragrafo texto-fraco">
          Gerencie suas campanhas, recompensas, atualizações, comentários e acompanhe os apoios recebidos.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label="Menu do estúdio">
          <nav aria-label="Seções do estúdio" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {SECOES.map((item) => (
              <button
                key={item.chave}
                type="button"
                aria-current={secao === item.chave ? 'page' : undefined}
                onClick={() => setSecao(item.chave)}
                className={
                  'paragrafo enfase flex shrink-0 items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors lg:w-full ' +
                  (secao === item.chave
                    ? 'fundo-cartao borda-marca texto-marca shadow-sm'
                    : 'fundo-cartao borda-padrao texto-herdado hover-fundo-sutil')
                }
              >
                <i className={`fa-solid ${item.icone} w-4`} aria-hidden="true"></i>
                {item.rotulo}
              </button>
            ))}
          </nav>
        </aside>

        <section
          id="estudio-conteudo"
          className="min-w-0"
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
        </section>
      </div>
    </div>
  );
}

interface CampanhaLinha extends Omit<CampanhaResponse, 'status'> {
  status: string;
  statusOriginal: CampanhaResponse['status'];
  temVideo: boolean;
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
  const listar = useCallback(async (): Promise<CampanhaLinha[]> => campanhas.map((campanha) => ({
    ...campanha,
    status: rotuloStatusCampanha(campanha),
    statusOriginal: campanha.status,
    temVideo: Boolean(campanha.videoApresentacaoUrl),
  })), [campanhas]);
  const podeCriar = statusPesquisador === 'ativo';
  const mudou = () => {
    recarregar();
    aoMudarCampanhas();
  };

  return (
    <>
      <GenericTable<CampanhaLinha>
        titulo="Campanhas"
        nivelTitulo={2}
        ajuda="Consulte e gerencie os projetos que você cadastrou."
        acaoTopo={podeCriar && <BotaoCriar rotulo="Nova campanha" aoClicar={abrirCriando} />}
        colunas={[
          { chave: 'idCampanha', rotulo: 'id', tipo: 'id' },
          { chave: 'titulo', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'status', rotulo: 'situação', tipo: 'status', renderizar: renderizarStatus, textoExibido: textoStatus },
          { chave: 'dataInicio', rotulo: 'lançamento', tipo: 'data' },
          { chave: 'dataFim', rotulo: 'encerramento', tipo: 'data' },
          { chave: 'modelo', rotulo: 'modalidade', tipo: 'texto', renderizar: (linha) => ROTULO_MODELO_CAMPANHA[linha.modelo] },
          { chave: 'temVideo', rotulo: 'vídeo', tipo: 'simNao' },
          { chave: 'metaFinanceira', rotulo: 'meta', tipo: 'dinheiro' },
          { chave: 'valorBrutoArrecadado', rotulo: 'arrecadado', tipo: 'dinheiro', renderizar: renderizarArrecadado },
        ]}
        chavePrimaria="idCampanha"
        listar={listar}
        chaveRecarga={chaveRecarga}
        acoes={acoesCompletas}
        filtrosFacetados={[{ chave: 'status', rotulo: 'Situação', ordem: ORDEM_ROTULOS_STATUS_CAMPANHA }]}
        vazio={{
          icone: 'fa-flask',
          titulo: 'Nenhuma campanha cadastrada.',
          texto: podeCriar
            ? 'Crie uma campanha para começar a compartilhar sua pesquisa.'
            : 'Campanhas são criadas por pesquisadores com perfil ativo.',
        }}
      />
      {criando && <ModalCriarCampanha auth={auth} comRecompensas aoMudar={mudou} aoFechar={fecharCriando} />}
      {alterando?.statusOriginal === 'rascunho' && (
        <ModalCriarCampanha auth={auth} idRascunho={alterando.idCampanha} comRecompensas aoMudar={mudou} aoFechar={fecharAlterando} />
      )}
      {alterando && alterando.statusOriginal !== 'rascunho' && (
        <ModalAlterarCampanha auth={auth} idCampanha={alterando.idCampanha} ehDono aoMudar={mudou} aoFechar={fecharAlterando} />
      )}
      {consultando && (
        <ModalConsultarCampanha auth={auth} idCampanha={consultando.idCampanha} comoDono aoFechar={fecharConsultando} />
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
  const [campanhaNova, setCampanhaNova] = useState('');
  const [editando, setEditando] = useState<{ campanha: number; recompensa?: RecompensaResponse } | null>(null);
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();
  const { executar } = useEnvio(reportarErro);
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
  const selecionada = campanhas.some((campanha) => String(campanha.idCampanha) === campanhaNova)
    ? campanhaNova
    : (campanhas[0] ? String(campanhas[0].idCampanha) : '');

  return (
    <>
      <GenericTable<RecompensaLinha>
        titulo="Recompensas"
        nivelTitulo={2}
        ajuda="Ofereça reconhecimento, acesso antecipado ou conteúdo digital às pessoas que apoiarem."
        acaoTopo={campanhas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="estudio-campanha-recompensa">Campanha da nova recompensa</label>
            <select id="estudio-campanha-recompensa" className="input-padrao" value={selecionada} onChange={(evento) => setCampanhaNova(evento.target.value)}>
              {campanhas.map((campanha) => <option key={campanha.idCampanha} value={campanha.idCampanha}>{campanha.titulo}</option>)}
            </select>
            <BotaoCriar rotulo="Nova recompensa" aoClicar={() => setEditando({ campanha: Number(selecionada) })} />
          </div>
        )}
        colunas={[
          { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'titulo', rotulo: 'recompensa', tipo: 'nome', umaLinha: true },
          { chave: 'tipoRotulo', rotulo: 'tipo', tipo: 'texto' },
          { chave: 'valorMinimo', rotulo: 'a partir de', tipo: 'dinheiro' },
          { chave: 'escolhidas', rotulo: 'escolhidas', tipo: 'numero' },
          {
            chave: 'situacao',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha) => (
              <div className="flex flex-wrap items-center gap-2">
                <span className={'badge ' + (linha.ativo ? 'badge-sucesso' : 'badge-neutro')}>{linha.situacao}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-pequeno"
                  onClick={() => void executar(async () => {
                    await recompensaApi.alterar(auth.authFetch, linha.idRecompensa, { ativo: !linha.ativo });
                    mostrar(linha.ativo ? 'Recompensa desativada.' : 'Recompensa reativada.');
                    recarregar();
                  })}
                >
                  {linha.ativo ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            ),
            textoExibido: (linha) => linha.situacao,
          },
        ]}
        chavePrimaria="idRecompensa"
        listar={listar}
        chaveRecarga={chaveRecarga}
        acoes={{ alterar: (linha) => setEditando({ campanha: linha.idCampanha, recompensa: linha }) }}
        filtrosFacetados={[
          { chave: 'tituloCampanha', rotulo: 'Campanha' },
          { chave: 'tipoRotulo', rotulo: 'Tipo' },
          { chave: 'situacao', rotulo: 'Situação' },
        ]}
        vazio={{
          icone: 'fa-gift',
          titulo: campanhas.length ? 'Nenhuma recompensa cadastrada.' : 'Cadastre uma campanha antes de oferecer recompensas.',
          texto: campanhas.length ? 'Cadastre recompensas simbólicas para suas campanhas.' : undefined,
        }}
      />
      {editando && (
        <ModalRecompensa
          auth={auth}
          idCampanha={editando.campanha}
          recompensa={editando.recompensa}
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
  const [campanhaNova, setCampanhaNova] = useState('');
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
  const selecionada = campanhasPublicaveis.some((campanha) => String(campanha.idCampanha) === campanhaNova)
    ? campanhaNova
    : (campanhasPublicaveis[0] ? String(campanhasPublicaveis[0].idCampanha) : '');

  return (
    <>
      <GenericTable<AtualizacaoLinha>
        titulo="Atualizações"
        nivelTitulo={2}
        ajuda="Publique o andamento da pesquisa e registre resultados para quem acompanha suas campanhas."
        acaoTopo={campanhasPublicaveis.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="estudio-campanha-atualizacao">Campanha da nova atualização</label>
            <select id="estudio-campanha-atualizacao" className="input-padrao" value={selecionada} onChange={(evento) => setCampanhaNova(evento.target.value)}>
              {campanhasPublicaveis.map((campanha) => <option key={campanha.idCampanha} value={campanha.idCampanha}>{campanha.titulo}</option>)}
            </select>
            <BotaoCriar rotulo="Nova atualização" aoClicar={() => setEditando({ campanha: Number(selecionada) })} />
          </div>
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
              <div className="flex flex-wrap items-center gap-2">
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
          { chave: 'tituloCampanha', rotulo: 'Campanha' },
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
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();
  const { executar } = useEnvio(reportarErro);
  const listar = useCallback(async (): Promise<ComentarioLinha[]> => {
    const listas = await Promise.all(campanhas.map(async (campanha) => {
      const comentarios = await listarComentariosDaCampanha(auth.authFetch, campanha.idCampanha);
      const endossosAtivos = comentarios.filter((comentario) => comentario.endossado && comentario.ativo).length;
      return comentarios.map((comentario) => ({
        ...comentario,
        tituloCampanha: campanha.titulo,
        autor: comentario.nomePesquisador ?? 'Pesquisador removido',
        endosso: comentario.endossado ? `Endossado (#${comentario.ordemEndosso ?? '—'})` : 'Pendente',
        endossosAtivos,
      }));
    }));
    return listas.flat();
  }, [auth.authFetch, campanhas]);
  const recarregar = () => setChaveRecarga((atual) => atual + 1);
  const alternarEndosso = (linha: ComentarioLinha, endossar: boolean) => void executar(async () => {
    await comentarioApi.alternarEndosso(auth.authFetch, linha.idComentario, endossar);
    mostrar(endossar ? 'Comentário endossado.' : 'Endosso removido.');
    recarregar();
  });

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
              renderizar: (linha) => (
                <span className={'badge ' + (linha.endossado ? 'badge-sucesso' : 'badge-aviso')}>{linha.endosso}</span>
              ),
              textoExibido: (linha) => linha.endosso,
            }
          ]}
          chavePrimaria="idComentario"
          listar={listar}
          chaveRecarga={chaveRecarga}
          acoes={{
            consultar: setConsultando,
            excluir: setExcluindo,
            endossarComentario: (linha) => alternarEndosso(linha, true),
            removerEndosso: (linha) => alternarEndosso(linha, false),
          }}
          acaoIndisponivel={(linha, acao) => {
            if (acao === 'endossarComentario') {
              if (linha.endossado) {
                return null;
              }
              return linha.endossosAtivos >= limiteEndossos
                ? `O limite de ${limiteEndossos} endossos ativos desta campanha foi atingido.`
                : undefined;
            }
            if (acao === 'removerEndosso') {
              return linha.endossado ? undefined : null;
            }
            return undefined;
          }}
          filtrosFacetados={[
            { chave: 'tituloCampanha', rotulo: 'Campanha' },
            { chave: 'endosso', rotulo: 'Endosso' },
          ]}
          vazio={{
            icone: 'fa-comments',
            titulo: campanhas.length ? 'Nenhum comentário recebido.' : 'Cadastre uma campanha para receber comentários.',
            texto: 'Os comentários das campanhas aparecerão aqui para consulta e endosso.',
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
      {excluindo && (
        <ModalExcluirComentario
          autor={excluindo.autor}
          conteudo={excluindo.conteudo}
          excluir={(bloquear) => bloquear
            ? comentarioApi.bloquear(auth.authFetch, excluindo.idComentario).then(() => undefined)
            : comentarioApi.excluir(auth.authFetch, excluindo.idComentario)}
          aoFechar={() => setExcluindo(null)}
          aoExcluido={recarregar}
        />
      )}
    </>
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
      <p className="paragrafo texto-fraco mb-4">
        Consulte os apoios recebidos em cada campanha. A identidade de quem contribuiu anonimamente não é exibida.
      </p>
      <GenericTable<ContribuicaoRecebida>
        titulo="Contribuições"
        nivelTitulo={2}
        ajuda="Acompanhe o valor, a situação e a recompensa de cada apoio recebido."
        colunas={[
          { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'apoiador', rotulo: 'apoiador', tipo: 'nome', umaLinha: true },
          { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro' },
          { chave: 'criadoEm', rotulo: 'data', tipo: 'dataHora' },
          {
            chave: 'meioPagamento',
            rotulo: 'meio',
            tipo: 'texto',
            renderizar: (linha) => <span>{ROTULO_MEIO_PAGAMENTO[linha.meioPagamento]}</span>,
            textoExibido: (linha) => ROTULO_MEIO_PAGAMENTO[linha.meioPagamento],
          },
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
