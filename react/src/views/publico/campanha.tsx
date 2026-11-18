import { useCallback, useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { Carregando } from '../../components/layout/carregando';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  classeBadgeCampanha,
  emBreve,
  EXPLICACAO_PUBLICA_MODELO_CAMPANHA,
  ROTULO_MODELO_CAMPANHA,
  rotuloStatusCampanha,
  STATUS_PUBLICADA,
} from '../../services/12-campanha/constants/status-campanha.constants';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { marcoCronogramaApi } from '../../services/14-marco-cronograma/api/marco-cronograma.api';
import type { MarcoCronogramaResponse } from '../../services/14-marco-cronograma/type/marco-cronograma.type';
import { orcamentoCampanhaApi } from '../../services/13-orcamento-campanha/api/orcamento-campanha.api';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import type { PropsPagina } from '../../services/router/pagina.type';
import { comentarioApi } from '../../services/17-comentario/api/comentario.api';
import type { ComentarioResponse } from '../../services/17-comentario/type/comentario.type';
import { contribuicaoApi } from '../../services/22-contribuicao/api/contribuicao.api';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { OrcamentoRosca } from './orcamento-rosca';
import {
  campanhaAceitaApoios,
  diasRestantes,
  duracaoEmDias,
  formatarData,
  ordenarAtualizacoes,
  percentualArrecadado,
} from './util-campanhas';
import { CartaoAcoesCampanha, FormComentarCampanha } from './acoes-campanha';
import { ModalAtualizacoes } from './lista-atualizacoes';
import { ModalApoiar } from './modal-apoiar';
import { definirTituloDaPagina } from '../../components/layout/definir-titulo-pagina';
import { CartaoEndosso } from './cartao-endosso';
import { LinkAcademicoExterno } from './links-academicos';
import { useLinksAcademicos } from './use-links-academicos';
import { enderecoVideoIncorporado } from '../../services/12-campanha/util/video-incorporado.util';
import { ContagemRegressiva } from './contagem-regressiva';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import { ROTULO_TIPO_RECOMPENSA } from '../../services/18-recompensa/constants/recompensa.constants';
import type { RecompensaResponse } from '../../services/18-recompensa/type/recompensa.type';

type AbaCampanha = 'sobre' | 'orcamento' | 'cronograma' | 'recompensas' | 'comentar';

interface EstadoSecundario<T> {
  dados: T[];
  erro: boolean;
}

const VAZIO = { dados: [], erro: false };

function executarSeAtivo(ativo: boolean, acao: () => void) {
  if (ativo) acao();
}

export function Campanha({ auth }: PropsPagina) {
  const { id } = useParams();
  const idCampanha = Number(id);
  const idValido = Number.isSafeInteger(idCampanha) && idCampanha > 0;
  const [campanha, setCampanha] = useState<CampanhaResponse | null>(null);
  const [orcamentos, setOrcamentos] = useState<EstadoSecundario<OrcamentoCampanhaResponse>>(VAZIO);
  const [marcos, setMarcos] = useState<EstadoSecundario<MarcoCronogramaResponse>>(VAZIO);
  const [recompensas, setRecompensas] = useState<EstadoSecundario<RecompensaResponse>>(VAZIO);
  const [atualizacoes, setAtualizacoes] = useState<EstadoSecundario<AtualizacaoCampanhaResponse>>(VAZIO);
  const [comentarios, setComentarios] = useState<EstadoSecundario<ComentarioResponse>>(VAZIO);
  const [comentariosCarregando, setComentariosCarregando] = useState(false);
  const [apoiosPagos, setApoiosPagos] = useState<number | null>(null);
  const [apoiosCarregando, setApoiosCarregando] = useState(false);
  const [erroApoios, setErroApoios] = useState(false);
  const [carregando, setCarregando] = useState(idValido);
  const [aba, setAba] = useState<AbaCampanha>('sobre');
  const [vendoAtualizacoes, setVendoAtualizacoes] = useState(false);
  // RF-061: a contagem regressiva chegou a zero; buscar a campanha de novo (passa a aceitar apoios).
  const [recarga, setRecarga] = useState(0);
  const recarregarCampanha = useCallback(() => setRecarga((total) => total + 1), []);
  // Modal Apoiar aberto pelo endereço (?apoiar=1&valor=50): os links antigos do /checkout e o "Apoiar de novo" chegam
  // com ele aberto.
  const [parametros, setParametros] = useSearchParams();
  const abrirApoio = (valor?: number) =>
    setParametros(valor ? { apoiar: '1', valor: String(valor) } : { apoiar: '1' }, { replace: true });
  const fecharApoio = () => setParametros({}, { replace: true });
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });

  useEffect(() => {
    if (!idValido) return;
    let ativo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    setCampanha(null);
    setOrcamentos(VAZIO);
    setRecompensas(VAZIO);
    setMarcos(VAZIO);
    setAtualizacoes(VAZIO);
    setComentarios(VAZIO);
    setComentariosCarregando(false);
    setApoiosPagos(null);
    setApoiosCarregando(false);
    setErroApoios(false);
    setAba('sobre');
    limparErro();

    campanhaApi.buscar(auth.authFetch, idCampanha)
      .then(async (resultado) => {
        if (!ativo) return;
        setCampanha(resultado);
        if (
          resultado.status === 'rascunho' ||
          resultado.status === 'aguardando_aprovacao' ||
          resultado.status === 'rejeitado'
        ) return;

        setComentariosCarregando(true);
        setApoiosCarregando(true);
        const [orcamento, cronograma, novidades, endossos, resumoApoios, listaRecompensas] = await Promise.allSettled([
          orcamentoCampanhaApi.listar(auth.authFetch, idCampanha),
          marcoCronogramaApi.listar(auth.authFetch, idCampanha),
          atualizacaoCampanhaApi.listar(auth.authFetch, idCampanha),
          comentarioApi.listarPagina(auth.authFetch, idCampanha, 1, 100, true),
          contribuicaoApi.apoiosPublicosCampanha(auth.authFetch, idCampanha),
          recompensaApi.listar(auth.authFetch, idCampanha),
        ]);
        executarSeAtivo(ativo, () => {
          setOrcamentos({
            dados: orcamento.status === 'fulfilled' ? orcamento.value : [],
            erro: orcamento.status === 'rejected',
          });
          setMarcos({
            dados: cronograma.status === 'fulfilled' ? cronograma.value : [],
            erro: cronograma.status === 'rejected',
          });
          setAtualizacoes({
            dados: novidades.status === 'fulfilled' ? ordenarAtualizacoes(novidades.value) : [],
            erro: novidades.status === 'rejected',
          });
          setComentarios({
            dados: endossos.status === 'fulfilled' ? endossos.value.dados : [],
            erro: endossos.status === 'rejected',
          });
          setComentariosCarregando(false);
          setApoiosPagos(resumoApoios.status === 'fulfilled' ? resumoApoios.value.pagas : null);
          setRecompensas({
            dados: listaRecompensas.status === 'fulfilled'
              ? listaRecompensas.value.filter((item) => item.ativo).sort((a, b) => a.valorMinimo - b.valorMinimo)
              : [],
            erro: listaRecompensas.status === 'rejected',
          });
          setErroApoios(resumoApoios.status === 'rejected');
          setApoiosCarregando(false);
        });
      })
      .catch((erroRequisicao: unknown) => {
        if (ativo) reportarErro(erroRequisicao);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
    // Os dados são recarregados quando a campanha da URL ou a sessão muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha, idValido, recarga]);

  // A aba do navegador com o nome da campanha (TituloDaPagina põe só "Campanha").
  useEffect(() => {
    if (campanha) definirTituloDaPagina(campanha.titulo);
  }, [campanha]);

  const videoIncorporado = enderecoVideoIncorporado(campanha?.videoApresentacaoUrl);
  const linksPesquisador = useLinksAcademicos(auth.authFetch, campanha?.idUsuario);
  const linkPrincipal = linksPesquisador?.[0] ?? null;
  const percentual = campanha ? percentualArrecadado(campanha) : null;
  const publicada = campanha ? STATUS_PUBLICADA.has(campanha.status) : false;
  const dias = campanha ? diasRestantes(campanha.dataFim) : null;
  const aceitaApoios = campanha !== null && campanhaAceitaApoios(campanha);
  // Aba Comentar: só para pesquisador logado que não é o dono, em campanha publicada que aceita comentário (RF-096).
  const podeComentar =
    publicada &&
    auth.usuario?.ehPesquisador === true &&
    auth.usuario.idUsuario !== campanha?.idUsuario &&
    campanha?.status !== 'encerrado_moderacao';
  const abas: { chave: AbaCampanha; rotulo: string }[] = [
    { chave: 'sobre', rotulo: 'Sobre o projeto' },
    { chave: 'orcamento', rotulo: 'Orçamento' },
    { chave: 'cronograma', rotulo: 'Cronograma' },
    { chave: 'recompensas', rotulo: 'Recompensas' },
    ...(podeComentar ? [{ chave: 'comentar' as const, rotulo: 'Comentar' }] : []),
  ];
  // Abas no padrão da W3C (ARIA Authoring Practices): só a aba ativa entra no Tab; as setas, Home e End trocam de aba e
  // levam o foco junto (16-11-2026, auditoria Nielsen/WCAG).
  const moverAba = (evento: KeyboardEvent<HTMLButtonElement>, atual: number) => {
    const destino =
      evento.key === 'ArrowRight' ? (atual + 1) % abas.length
        : evento.key === 'ArrowLeft' ? (atual - 1 + abas.length) % abas.length
          : evento.key === 'Home' ? 0
            : evento.key === 'End' ? abas.length - 1
              : null;
    if (destino === null) return;
    evento.preventDefault();
    setAba(abas[destino].chave);
    document.getElementById(`tab-btn-${abas[destino].chave}`)?.focus();
  };

  return (
    <div id="view-campanha" className="view-section flex-grow pagina-publica campanha-detalhe">
      {!idValido && <div className="max-w-7xl mx-auto px-4 py-10"><MensagemErro texto="O endereço da campanha é inválido." /></div>}
      {carregando && <div className="max-w-7xl mx-auto px-4 py-10"><Carregando /></div>}
      {!carregando && erro && <div className="max-w-7xl mx-auto px-4 py-10"><MensagemErro texto={erro} /></div>}
      {!carregando && !erro && campanha && (
        <>
          <section
            className="campanha-detalhe__hero pt-14 pb-24 relative overflow-hidden texto-sobre-escuro superficie-escura"
            style={{ background: 'var(--cor-cianotipo-800)' }}
          >
            {/* Capa de fundo no banner (capaNoBanner, marcada por padrão), escurecida para o texto continuar legível. */}
            {campanha.imagemCapaUrl && campanha.capaNoBanner && (
              <>
                <img src={campanha.imagemCapaUrl} alt="" aria-hidden="true" className="campanha-detalhe__imagem-capa" />
                <div className="campanha-detalhe__capa-sobreposicao" aria-hidden="true" />
              </>
            )}
            <div className="absolute inset-0 grade-medicao" aria-hidden="true" />
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <nav aria-label="Trilha de navegação" className="text-sm font-medium texto-sobre-escuro mb-6 flex items-center gap-2">
                <Link className="inline-flex items-center gap-2 hover-texto-sobre-escuro-forte transition" to="/">
                  <i className="fa-solid fa-house text-xs" aria-hidden="true" />
                  Home
                </Link>
                <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true" />
                <span aria-current="page">{campanha.nomeArea ?? 'Campanha'}</span>
              </nav>
              <span className="veu-claro texto-sobre-escuro-forte microrrotulo px-3 py-1.5 rounded-full mb-4 inline-flex items-center gap-2">
                <i className="fa-solid fa-flask" aria-hidden="true" />
                Projeto {ROTULO_MODELO_CAMPANHA[campanha.modelo]}
              </span>
              <h1 className="titulo-pagina texto-sobre-escuro-forte max-w-4xl mb-6">{campanha.titulo}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 texto-sobre-escuro text-sm font-medium">
                <Link className="flex items-center gap-2 hover:underline" to={`/pesquisador/${campanha.idUsuario}`}>
                  <span className="w-6 h-6 rounded-full fundo-marca-sobre-escuro flex items-center justify-center texto-sobre-escuro-forte font-bold text-xs" aria-hidden="true">
                    {campanha.nomePesquisador?.charAt(0).toLocaleUpperCase('pt-BR') ?? '?'}
                  </span>
                  {campanha.nomePesquisador ?? 'Pesquisador não informado'}
                </Link>
                {/* Área de conhecimento (a Alexia confirmou: a instituição vai só no cartão lateral do pesquisador). */}
                <span aria-hidden="true" className="hidden sm:inline">|</span>
                <span className="inline-flex items-center gap-2 veu-claro texto-marca-sobre-escuro microrrotulo px-3 py-1 rounded-full">
                  {campanha.nomeArea ?? 'Área não informada'}
                </span>
              </div>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 -mt-16 pb-16 flex flex-col lg:flex-row gap-10 relative z-10">
            <div className="flex-1 min-w-0">
              {/* Decisão de 14-11-2026: a imagem de capa ocupa este espaço quando não há vídeo; com vídeo, o vídeo manda
                  e a capa vira o fundo atrás do botão de play. Sem campo nem caixinha a mais no cadastro. */}
              <div className="campanha-detalhe__video w-full aspect-video rounded-xl overflow-hidden relative flex items-center justify-center mb-10 shadow-2xl">
                {campanha.imagemCapaUrl && (
                  <img
                    src={campanha.imagemCapaUrl}
                    alt={campanha.videoApresentacaoUrl ? '' : `Imagem de capa da campanha ${campanha.titulo}`}
                    aria-hidden={campanha.videoApresentacaoUrl ? true : undefined}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {videoIncorporado ? (
                  // RF-057: YouTube e Vimeo tocam aqui mesmo, na proporção 16:9 da caixa (aspect-video).
                  <iframe
                    src={videoIncorporado}
                    title={`Vídeo de apresentação: ${campanha.titulo}`}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 w-full h-full border-0"
                  />
                ) : campanha.videoApresentacaoUrl ? (
                  // Outro serviço de vídeo: o link para abrir em outra aba continua como alternativa.
                  <a
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 texto-sobre-escuro-forte bg-black/50 hover:bg-black/60 transition-colors group"
                    href={campanha.videoApresentacaoUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:bg-primary transition-colors">
                      <i className="fa-solid fa-play text-white text-2xl ml-1" aria-hidden="true" />
                    </span>
                    <span className="microrrotulo">
                      Assistir à apresentação do projeto<span className="sr-only"> (abre em outra aba)</span>
                    </span>
                    <span className="absolute bottom-4 left-4 bg-white/90 texto-padrao microrrotulo px-3 py-1 rounded-full border borda-padrao">
                      Vídeo de apresentação
                    </span>
                  </a>
                ) : campanha.imagemCapaUrl ? null : (
                  <div className="flex flex-col items-center gap-3 texto-sobre-escuro text-center px-6">
                    <i className="fa-solid fa-circle-play text-5xl opacity-70" aria-hidden="true" />
                    <p className="paragrafo texto-sobre-escuro-forte">
                      Vídeo de apresentação não disponível para esta campanha.
                    </p>
                  </div>
                )}
              </div>

              <div id="project-tab-buttons" className="campanha-detalhe__abas fundo-cartao rounded-xl shadow-sm border borda-padrao mb-8 p-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <div role="tablist" aria-label="Detalhes da campanha" className="flex items-center gap-2">
                  {abas.map((item, indice) => (
                    <button
                      aria-controls={`tab-${item.chave}`}
                      aria-selected={aba === item.chave}
                      tabIndex={aba === item.chave ? 0 : -1}
                      className={`whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition-colors ${aba === item.chave ? 'fundo-realce texto-forte' : 'texto-padrao hover-fundo-sutil'}`}
                      id={`tab-btn-${item.chave}`}
                      key={item.chave}
                      onClick={() => setAba(item.chave)}
                      onKeyDown={(evento) => moverAba(evento, indice)}
                      role="tab"
                      type="button"
                    >
                      {item.rotulo}
                    </button>
                  ))}
                </div>
                {/* Atualizações não é aba: abre o blog da campanha numa janela (ModalAtualizacoes). Fica separada, com o
                    ícone de janela, para não parecer que troca o painel de baixo. */}
                <span className="h-6 border-l borda-padrao shrink-0" aria-hidden="true" />
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setVendoAtualizacoes(true)}
                  className="whitespace-nowrap rounded-lg px-4 py-2 font-semibold texto-padrao hover-fundo-sutil transition-colors inline-flex items-center gap-2"
                >
                  <i className="fa-regular fa-newspaper" aria-hidden="true" />
                  Atualizações
                </button>
              </div>

              <div className="campanha-detalhe__painel-conteudo fundo-cartao rounded-xl shadow-sm border borda-padrao">
                {aba === 'sobre' && (
                  <section id="tab-sobre" aria-labelledby="tab-btn-sobre" role="tabpanel">
                    <h2 className="titulo-secao texto-forte mb-5">Sobre o projeto</h2>
                    <p className="paragrafo texto-padrao whitespace-pre-wrap">
                      {campanha.descricao || 'Esta campanha ainda não possui uma descrição pública.'}
                    </p>
                    <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t borda-padrao pt-6">
                      <div>
                        <dt className="rotulo">Início previsto</dt>
                        <dd className="paragrafo texto-padrao mt-1">{formatarData(campanha.dataInicio)}</dd>
                      </div>
                      <div>
                        <dt className="rotulo">Encerramento previsto</dt>
                        <dd className="paragrafo texto-padrao mt-1">{formatarData(campanha.dataFim)}</dd>
                      </div>
                    </dl>
                    {publicada && (
                      <section className="mt-8 border-t borda-padrao pt-6" aria-labelledby="comentarios-endossados-titulo">
                        <h3 id="comentarios-endossados-titulo" className="subtitulo texto-forte mb-4">
                          Endosso
                        </h3>
                        {comentariosCarregando && <Carregando />}
                        {!comentariosCarregando && comentarios.erro && (
                          <p className="paragrafo texto-fraco" role="status">
                            Não foi possível carregar os comentários endossados.
                          </p>
                        )}
                        {!comentariosCarregando && !comentarios.erro && comentarios.dados.length === 0 && (
                          <p className="paragrafo texto-fraco">Ainda não há comentários endossados nesta campanha.</p>
                        )}
                        {!comentariosCarregando && !comentarios.erro && comentarios.dados.length > 0 && (
                          <ul className="space-y-4">
                            {comentarios.dados.map((comentario) => (
                              <li key={comentario.idComentario}>
                                <CartaoEndosso
                                  nome={comentario.nomePesquisador}
                                  foto={comentario.fotoPesquisador}
                                  idPesquisador={comentario.idPesquisador}
                                  conteudo={comentario.conteudo}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    )}
                  </section>
                )}
                {aba === 'recompensas' && (
                  <section id="tab-recompensas" aria-labelledby="tab-btn-recompensas" role="tabpanel">
                    <h2 className="titulo-secao texto-forte mb-2">Recompensas</h2>
                    {/* Texto direto (16-11-2026, Alexia): o antigo dava a entender que bastava criar a conta para ganhar. A
                        explicação só aparece quando há recompensas; sem elas, só "Sem recompensas no momento". */}
                    {publicada && !recompensas.erro && recompensas.dados.length > 0 && (
                      <p className="paragrafo texto-fraco mb-5">
                        Ao apoiar, você ganha automaticamente todas as recompensas que o valor do seu apoio alcança, sem precisar
                        escolher. São agradecimentos simbólicos, sem entrega física.
                      </p>
                    )}
                    {!publicada && <p className="paragrafo texto-fraco">As recompensas ainda não estão disponíveis para esta campanha.</p>}
                    {publicada && recompensas.erro && <p className="paragrafo texto-fraco">Não foi possível carregar as recompensas.</p>}
                    {publicada && !recompensas.erro && recompensas.dados.length === 0 && (
                      <p className="paragrafo texto-fraco">Sem recompensas no momento.</p>
                    )}
                    {publicada && !recompensas.erro && recompensas.dados.length > 0 && (
                      <ul className="flex flex-col gap-4">
                        {recompensas.dados.map((item) => (
                          <li key={item.idRecompensa} className="rounded-xl border borda-padrao fundo-sutil p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="microrrotulo texto-marca mb-1">
                                A partir de <span className="numero">{formatarMoeda(item.valorMinimo)}</span> · {ROTULO_TIPO_RECOMPENSA[item.tipo]}
                              </p>
                              <h3 className="subtitulo texto-forte">{item.titulo}</h3>
                              {item.descricao && <p className="paragrafo texto-padrao mt-2 whitespace-pre-wrap">{item.descricao}</p>}
                            </div>
                            {aceitaApoios && (
                              <button
                                type="button"
                                onClick={() => abrirApoio(item.valorMinimo)}
                                className="btn btn-primary justify-center shrink-0"
                              >
                                Apoiar com {formatarMoeda(item.valorMinimo)}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Visitante: o convite no mesmo padrão do "Entre na sua conta para denunciar" (Alexia, 16-11-2026). Vai para o
                        Login (a pessoa pode já ter conta; quem não tem segue pelo "Cadastre-se" dele), que volta para a campanha. */}
                    {!auth.autenticado && publicada && (
                      <Link
                        to="/login"
                        state={{ voltarPara: `/campanha/${campanha.idCampanha}` }}
                        className="mt-6 inline-flex items-center gap-2 text-sm texto-fraco hover:underline"
                      >
                        <i className="fa-solid fa-gift" aria-hidden="true" />
                        Cadastre-se para acompanhar pesquisas e receber recompensas
                      </Link>
                    )}
                  </section>
                )}
                {aba === 'comentar' && podeComentar && (
                  <section id="tab-comentar" aria-labelledby="tab-btn-comentar" role="tabpanel">
                    <h2 className="titulo-secao texto-forte mb-2">Comentar</h2>
                    <FormComentarCampanha auth={auth} campanha={campanha} />
                  </section>
                )}
                {aba === 'orcamento' && (
                  <section id="tab-orcamento" aria-labelledby="tab-btn-orcamento" role="tabpanel">
                    <h2 className="titulo-secao texto-forte mb-5">Orçamento do projeto</h2>
                    {!publicada && <p className="paragrafo texto-fraco">O orçamento público ainda não está disponível para esta campanha.</p>}
                    {publicada && orcamentos.erro && <p className="paragrafo texto-fraco">Não foi possível carregar os itens de orçamento.</p>}
                    {publicada && !orcamentos.erro && orcamentos.dados.length === 0 && (
                      <p className="paragrafo texto-fraco">Nenhum item de orçamento está disponível para consulta.</p>
                    )}
                    {publicada && !orcamentos.erro && orcamentos.dados.length > 0 && (
                      <OrcamentoRosca itens={orcamentos.dados} meta={campanha.metaFinanceira} arrecadado={campanha.valorBrutoArrecadado} />
                    )}
                  </section>
                )}
                {aba === 'cronograma' && (
                  <section id="tab-cronograma" aria-labelledby="tab-btn-cronograma" role="tabpanel">
                    <h2 className="titulo-secao texto-forte mb-5">Cronograma</h2>
                    {!publicada && <p className="paragrafo texto-fraco">O cronograma público ainda não está disponível para esta campanha.</p>}
                    {publicada && marcos.erro && <p className="paragrafo texto-fraco">Não foi possível carregar o cronograma.</p>}
                    {publicada && !marcos.erro && marcos.dados.length === 0 && (
                      <p className="paragrafo texto-fraco">Nenhum marco do cronograma está disponível para consulta.</p>
                    )}
                    {publicada && !marcos.erro && marcos.dados.length > 0 && (
                      <ol className="linha-do-tempo">
                        {marcos.dados
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((marco) => (
                            <li className="linha-do-tempo__marco" key={marco.idMarco}>
                              <p className="rotulo-leitura texto-marca">{formatarData(marco.dataPrevista)}</p>
                              <h3 className="subtitulo mt-1">{marco.titulo}</h3>
                              {marco.descricao && <p className="paragrafo texto-padrao mt-2">{marco.descricao}</p>}
                            </li>
                          ))}
                      </ol>
                    )}
                  </section>
                )}
              </div>
            </div>

            <aside className="w-full lg:w-[400px] flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                <section className="fundo-cartao rounded-xl border borda-padrao p-8 shadow-xl" aria-label="Resumo da campanha">
                  <div className="mb-6">
                    <span className={`badge ${classeBadgeCampanha(campanha)}`}>
                      {rotuloStatusCampanha(campanha)}
                    </span>
                  </div>
                  <div className="mb-8">
                    <div className="numero numero--destaque texto-forte mb-2">{formatarMoeda(campanha.valorBrutoArrecadado)}</div>
                    <p className="text-sm texto-fraco font-medium">arrecadados da meta de {formatarMoeda(campanha.metaFinanceira)}</p>
                  </div>
                  <div className="mb-6">
                    {percentual !== null && (
                      <>
                        <div
                          aria-label={`${percentual}% da meta atingida`}
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.min(percentual, 100)}
                          className="h-3 rounded-full fundo-realce overflow-hidden"
                        >
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(percentual, 100)}%` }} />
                        </div>
                        <p className="legenda mt-2 texto-fraco">{percentual}% da meta arrecadada</p>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
                    <div className="fundo-destaque rounded-xl px-1 py-3 sm:p-3 border borda-padrao text-center min-w-0">
                      <div className="numero text-xl font-bold texto-forte">{percentual === null ? '—' : `${percentual}%`}</div>
                      <div className="microrrotulo texto-fraco">Atingido</div>
                    </div>
                    <div className="fundo-aviso rounded-xl px-1 py-3 sm:p-3 border borda-aviso text-center min-w-0">
                      {/* RF-061: antes do início, a duração da captação; "restantes" só depois que ela começa. */}
                      <div className="numero text-xl font-bold texto-aviso">
                        {(emBreve(campanha) ? duracaoEmDias(campanha.dataInicio, campanha.dataFim) : dias) ?? '—'}
                      </div>
                      <div className="microrrotulo texto-aviso">{emBreve(campanha) ? 'Dias de captação' : 'Dias restantes'}</div>
                    </div>
                    <div className="fundo-marca-sutil rounded-xl px-1 py-3 sm:p-3 border borda-marca text-center min-w-0">
                      <div className="numero text-xl font-bold texto-marca">
                        {apoiosPagos ?? (apoiosCarregando ? '…' : '—')}
                      </div>
                      <div className="microrrotulo texto-marca">Apoios</div>
                    </div>
                  </div>
                  {erroApoios && (
                    <p className="paragrafo texto-erro mb-4" role="status">
                      Não foi possível carregar a quantidade de apoios pagos.
                    </p>
                  )}
                  {aceitaApoios ? (
                    <button
                      type="button"
                      className="btn btn-primary w-full justify-center text-lg py-4 mb-6"
                      onClick={() => abrirApoio()}
                    >
                      Apoiar esta pesquisa
                      <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </button>
                  ) : (
                    emBreve(campanha) && campanha.dataInicio ? (
                      <ContagemRegressiva inicio={campanha.dataInicio} aoComecar={recarregarCampanha} />
                    ) : (
                      <p className="paragrafo texto-fraco mb-6" role="status">
                        Esta campanha não está aceitando apoios no momento.
                      </p>
                    )
                  )}
                  <details className="rounded-xl border borda-padrao fundo-sutil p-4 text-sm texto-padrao">
                    <summary className="font-semibold texto-forte cursor-pointer select-none">
                      Como funciona o modelo {ROTULO_MODELO_CAMPANHA[campanha.modelo]}
                    </summary>
                    <p className="mt-4 leading-relaxed">{EXPLICACAO_PUBLICA_MODELO_CAMPANHA[campanha.modelo]}</p>
                  </details>
                </section>

                {publicada && <CartaoAcoesCampanha auth={auth} campanha={campanha} />}

                <section className="cartao fundo-cartao border borda-padrao rounded-xl p-6">
                  <h2 className="rotulo mb-5 border-b borda-padrao pb-3">Pesquisador Responsável</h2>
                  <Link
                    className="flex items-center gap-4 mb-5 hover:opacity-80 transition-opacity"
                    to={`/pesquisador/${campanha.idUsuario}`}
                  >
                    <div className="w-14 h-14 fundo-sucesso border borda-sucesso texto-sucesso rounded-full flex items-center justify-center text-xl font-black shadow-inner" aria-hidden="true">
                      {campanha.nomePesquisador?.charAt(0).toLocaleUpperCase('pt-BR') ?? '?'}
                    </div>
                    <div>
                      <p className="font-bold texto-forte text-base">{campanha.nomePesquisador ?? 'Pesquisador não informado'}</p>
                      {campanha.instituicaoPesquisador && (
                        <p className="text-xs texto-fraco mb-0.5">{campanha.instituicaoPesquisador}</p>
                      )}
                    </div>
                  </Link>
                  {/* RF-027/RF-072: o link principal (o primeiro da lista do perfil); sem link, nada aparece. */}
                  {linkPrincipal && (
                    <p className="paragrafo mb-5">
                      <LinkAcademicoExterno link={linkPrincipal} />
                    </p>
                  )}
                  <Link
                    className="w-full inline-flex justify-center items-center gap-2 border-2 borda-padrao texto-padrao hover-borda-forte hover-fundo-sutil text-sm font-bold py-3 rounded-xl transition-all"
                    to={`/pesquisador/${campanha.idUsuario}`}
                  >
                    <i className="fa-solid fa-user" aria-hidden="true" />
                    Ver perfil público
                  </Link>
                </section>
              </div>
            </aside>
          </div>
          {vendoAtualizacoes && (
            <ModalAtualizacoes
              titulo={campanha.titulo}
              atualizacoes={publicada ? atualizacoes.dados : []}
              erro={atualizacoes.erro}
              aoFechar={() => setVendoAtualizacoes(false)}
            />
          )}
          {aceitaApoios && parametros.get('apoiar') === '1' && (
            <ModalApoiar
              auth={auth}
              campanha={campanha}
              recompensas={recompensas.dados
                .filter((item) => item.ativo)
                .sort((a, b) => a.valorMinimo - b.valorMinimo)}
              valorInicial={Number(parametros.get('valor')) || undefined}
              aoFechar={fecharApoio}
            />
          )}
        </>
      )}
    </div>
  );
}

