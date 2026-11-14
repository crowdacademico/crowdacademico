import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { ROTULO_TIPO_VINCULO, ROTULO_TITULO_ACADEMICO } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import { seguirPesquisadorApi } from '../../services/16-seguir/api/seguir-pesquisador.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';
import type { PropsPagina } from '../../services/router/pagina.type';
import { CartaoCampanha } from './componentes-campanhas';

interface EstadoSeguimento {
  idPesquisador: number;
  idVisualizador: number | null;
  seguidores: number | null;
  seguindo: boolean | null;
  erroContagem: string | null;
  erroLista: string | null;
  erroAcao: string | null;
  enviando: boolean;
}

export function PerfilPesquisador({ auth }: PropsPagina) {
  const { idUsuario } = useParams();
  const [estadoSeguimento, setEstadoSeguimento] = useState<EstadoSeguimento | null>(null);
  const [tentativaSeguimento, setTentativaSeguimento] = useState(0);
  const [pagina, setPagina] = useState<{
    idUsuario: string;
    perfil: PerfilPesquisadorResponse | null;
    pesquisador: UsuarioResponse | null;
    campanhas: CampanhaResponse[] | null;
  } | null>(null);
  const id = Number(idUsuario);
  const idValido = idUsuario !== undefined && /^\d+$/.test(idUsuario) && Number.isSafeInteger(id) && id > 0;
  const dadosAtuais = pagina?.idUsuario === idUsuario ? pagina : null;
  const carregando = idValido && dadosAtuais === null;
  const perfil = dadosAtuais?.perfil ?? null;
  const pesquisador = dadosAtuais?.pesquisador ?? null;
  const campanhas = dadosAtuais?.campanhas ?? null;
  const erroPerfil = !idValido || (!carregando && perfil === null);
  const idVisualizador = auth.usuario?.idUsuario ?? null;
  const dadosSeguimento =
    estadoSeguimento?.idPesquisador === id && estadoSeguimento.idVisualizador === idVisualizador
      ? estadoSeguimento
      : null;

  useEffect(() => {
    let ativo = true;
    if (!idValido) {
      return;
    }

    void Promise.allSettled([
      perfilPesquisadorApi.buscar(auth.authFetch, id),
      usuarioApi.buscar(auth.authFetch, id),
      campanhaApi.listar(auth.authFetch, { idUsuario: id }),
    ]).then(([resultadoPerfil, resultadoUsuario, resultadoCampanhas]) => {
      if (!ativo) {
        return;
      }

      setPagina({
        idUsuario,
        perfil: resultadoPerfil.status === 'fulfilled' ? resultadoPerfil.value : null,
        pesquisador: resultadoUsuario.status === 'fulfilled' ? resultadoUsuario.value : null,
        campanhas: resultadoCampanhas.status === 'fulfilled' ? resultadoCampanhas.value : null,
      });
    });

    return () => {
      ativo = false;
    };
  }, [auth.authFetch, id, idValido, idUsuario]);

  useEffect(() => {
    let ativo = true;
    if (!idValido || auth.carregando) {
      return;
    }

    const requisicaoContagem = seguirPesquisadorApi.contarSeguidores(auth.authFetch, id);
    const requisicaoLista =
      auth.autenticado && idVisualizador !== null
        ? seguirPesquisadorApi.listarMinhas(auth.authFetch)
        : Promise.resolve(null);

    void Promise.allSettled([requisicaoContagem, requisicaoLista]).then(
      ([resultadoContagem, resultadoLista]) => {
        if (!ativo) {
          return;
        }

        setEstadoSeguimento({
          idPesquisador: id,
          idVisualizador,
          seguidores: resultadoContagem.status === 'fulfilled' ? resultadoContagem.value.seguidores : null,
          seguindo:
            resultadoLista.status === 'fulfilled' && resultadoLista.value !== null
              ? resultadoLista.value.some((item) => item.idPesquisador === id)
              : null,
          erroContagem:
            resultadoContagem.status === 'rejected' ? traduzirErro(resultadoContagem.reason) : null,
          erroLista:
            resultadoLista.status === 'rejected' ? traduzirErro(resultadoLista.reason) : null,
          erroAcao: null,
          enviando: false,
        });
      },
    );

    return () => {
      ativo = false;
    };
  }, [auth.authFetch, auth.autenticado, auth.carregando, id, idValido, idVisualizador, tentativaSeguimento]);

  async function alternarSeguimento(): Promise<void> {
    if (!dadosSeguimento || dadosSeguimento.seguindo === null || dadosSeguimento.enviando) {
      return;
    }

    const seguiaAntes = dadosSeguimento.seguindo;
    setEstadoSeguimento({ ...dadosSeguimento, enviando: true, erroAcao: null });
    try {
      if (seguiaAntes) {
        await seguirPesquisadorApi.deixarDeSeguir(auth.authFetch, id);
      } else {
        await seguirPesquisadorApi.seguir(auth.authFetch, id);
      }
      setEstadoSeguimento((estado) =>
        estado?.idPesquisador === id && estado.idVisualizador === idVisualizador
          ? {
              ...estado,
              seguidores:
                estado.seguidores === null
                  ? null
                  : Math.max(0, estado.seguidores + (seguiaAntes ? -1 : 1)),
              seguindo: !seguiaAntes,
              enviando: false,
              erroAcao: null,
            }
          : estado,
      );
    } catch (erro: unknown) {
      setEstadoSeguimento((estado) =>
        estado?.idPesquisador === id && estado.idVisualizador === idVisualizador
          ? { ...estado, enviando: false, erroAcao: traduzirErro(erro) }
          : estado,
      );
    }
  }

  return (
    <div id="view-perfil-pesquisador" className="pagina-publica view-section flex-grow fundo-pagina min-h-screen pb-16">
      <header
        id="perfil-pesquisador-capa"
        className="superficie-escura relative mb-10 overflow-hidden py-14"
      >
        <div className="mx-auto max-w-5xl px-4">
          <p className="rotulo-leitura texto-marca mb-3">Perfil público</p>
          <h1 className="titulo-pagina">{pesquisador?.nome ?? 'Perfil de pesquisador'}</h1>
          <p className="paragrafo texto-padrao mt-3">
            {carregando
              ? 'Carregando as informações públicas do perfil…'
              : perfil
                ? `${ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico]} · ${ROTULO_TIPO_VINCULO[perfil.tipoVinculo]}`
                : 'Informações públicas do pesquisador'}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section id="perfil-pesquisador-bio" className="pagina-publica__cartao">
              <h2 className="titulo-secao mb-3">Sobre o pesquisador</h2>
              <p className="paragrafo texto-padrao">
                {carregando
                  ? 'Carregando…'
                  : erroPerfil
                    ? 'Não foi possível encontrar um perfil público de pesquisador para este endereço.'
                    : 'A plataforma não disponibiliza uma biografia neste perfil. As informações públicas cadastradas são apresentadas nas seções abaixo.'}
              </p>
            </section>

            <section id="perfil-pesquisador-campanhas">
              <h2 className="titulo-secao mb-4">Campanhas</h2>
              {campanhas === null ? (
                <p className="paragrafo texto-padrao" role="status">
                  {carregando
                    ? 'Carregando campanhas públicas…'
                    : 'Não foi possível carregar as campanhas públicas deste pesquisador.'}
                </p>
              ) : campanhas.length === 0 ? (
                <p className="paragrafo texto-padrao">
                  Não há campanhas públicas disponíveis para este perfil.
                </p>
              ) : (
                <div className="grade-campanhas grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {campanhas.map((campanha) => (
                    <CartaoCampanha campanha={campanha} key={campanha.idCampanha} />
                  ))}
                </div>
              )}
            </section>

            <section id="perfil-pesquisador-formacao">
              <h2 className="titulo-secao mb-4">Formação e vínculo</h2>
              <div className="linha-do-tempo">
                {perfil ? (
                  <>
                    <div className="linha-do-tempo__item">
                      <span className="linha-do-tempo__marcador" aria-hidden="true" />
                      <h3 className="subtitulo mb-2">{ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico]}</h3>
                      <p className="paragrafo texto-padrao">Título acadêmico informado no cadastro.</p>
                    </div>
                    <div className="linha-do-tempo__item">
                      <span className="linha-do-tempo__marcador" aria-hidden="true" />
                      <h3 className="subtitulo mb-2">{ROTULO_TIPO_VINCULO[perfil.tipoVinculo]}</h3>
                      <p className="paragrafo texto-padrao">
                        {perfil.tipoVinculo === 'institucional'
                          ? perfil.vinculoInstitucional ?? 'Instituição não informada.'
                          : 'O cadastro informa vínculo independente.'}
                      </p>
                    </div>
                    <p className="paragrafo texto-padrao">
                      O cadastro guarda o título acadêmico e o vínculo atual, não um histórico detalhado de formação.
                    </p>
                  </>
                ) : (
                  <p className="paragrafo texto-padrao">
                    {carregando ? 'Carregando…' : 'Formação e vínculo não disponíveis para este perfil.'}
                  </p>
                )}
              </div>
            </section>

            <section id="perfil-pesquisador-publicacoes">
              <h2 className="titulo-secao mb-4">Publicações recentes</h2>
              <div className="space-y-3">
                <p className="paragrafo texto-padrao">
                  A API atual não fornece publicações para este perfil; por isso, nenhuma publicação é exibida.
                </p>
              </div>
            </section>
          </div>

          <aside>
            <div className="pagina-publica__cartao cartao sticky top-24" id="perfil-pesquisador-cta">
              <h2 className="subtitulo mb-3">Acompanhe a pesquisa</h2>
              <p className="paragrafo texto-padrao">
                {campanhas === null
                  ? carregando
                    ? 'Carregando campanhas públicas…'
                    : 'A lista de campanhas não está disponível no momento.'
                  : campanhas.length === 0
                    ? 'Não há campanhas públicas associadas a este perfil no momento.'
                    : `${campanhas.length} ${campanhas.length === 1 ? 'campanha pública disponível' : 'campanhas públicas disponíveis'} na seção acima.`}
              </p>
              <p className="paragrafo texto-padrao mt-3" aria-live="polite">
                {dadosSeguimento === null
                  ? idValido
                    ? 'Carregando contagem de seguidores…'
                    : 'Contagem de seguidores indisponível.'
                  : dadosSeguimento.seguidores === null
                    ? dadosSeguimento.erroContagem
                      ? 'Contagem de seguidores indisponível.'
                      : 'Carregando contagem de seguidores…'
                    : `${dadosSeguimento.seguidores} ${dadosSeguimento.seguidores === 1 ? 'seguidor' : 'seguidores'}`}
              </p>
              {dadosSeguimento?.erroContagem && (
                <p className="paragrafo texto-padrao mt-2" role="alert">
                  Não foi possível carregar a contagem: {dadosSeguimento.erroContagem}
                </p>
              )}
              {auth.carregando ? (
                <p className="paragrafo texto-padrao mt-4" role="status">
                  Verificando sua sessão…
                </p>
              ) : !auth.autenticado ? (
                <p className="paragrafo texto-padrao mt-4">
                  <Link to="/login" className="link-texto">
                    Entre para seguir este pesquisador.
                  </Link>
                </p>
              ) : dadosSeguimento?.erroLista ? (
                <>
                  <p className="paragrafo texto-padrao mt-3" role="alert">
                    Não foi possível verificar se você segue este pesquisador: {dadosSeguimento.erroLista}
                  </p>
                  <button
                    type="button"
                    className="btn btn-secundario mt-3"
                    onClick={() => setTentativaSeguimento((tentativa) => tentativa + 1)}
                  >
                    Tentar novamente
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary mt-4"
                  disabled={!dadosSeguimento || dadosSeguimento.seguindo === null || dadosSeguimento.enviando}
                  onClick={() => void alternarSeguimento()}
                >
                  {dadosSeguimento?.enviando
                    ? 'Atualizando…'
                    : dadosSeguimento?.seguindo
                      ? 'Deixar de seguir'
                      : dadosSeguimento?.seguindo === false
                        ? 'Seguir pesquisador'
                        : 'Carregando…'}
                </button>
              )}
              {dadosSeguimento?.erroAcao && (
                <p className="paragrafo texto-padrao mt-3" role="alert">
                  Não foi possível atualizar o seguimento: {dadosSeguimento.erroAcao}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
