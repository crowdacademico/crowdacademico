import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { Carregando } from '../../components/layout/carregando';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { BarraAbasBotoes } from '../../components/layout/barra-abas-botoes';
import { BarraBuscaPublica } from '../../components/search/barra-busca-publica';
import { GrupoFiltroExpansivel } from '../../components/search/grupo-filtro-expansivel';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import {
  emBreve,
  ROTULO_MODELO_CAMPANHA,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { ROTULO_TITULO_ACADEMICO } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { ModeloCampanha } from '../../services/12-campanha/type/campanha.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import type { PropsPagina } from '../../services/router/pagina.type';
import { CartaoCampanha, EstadoVazio } from './componentes-campanhas';
import { CartaoPesquisador } from './componentes-pesquisadores';
import { campanhaVisivelNoCatalogo, percentualArrecadado } from './util-campanhas';
import { useSeguirCampanhas } from './use-seguir-campanhas';

type FiltroStatus = 'todos' | 'captacao' | 'em-breve' | 'financiados';
type FiltroModelo = 'todos' | ModeloCampanha;
type AbaExplorar = 'projetos' | 'pesquisadores';

const ABAS_EXPLORAR = [
  { chave: 'projetos', rotulo: 'Projetos', icone: 'fa-lightbulb' },
  { chave: 'pesquisadores', rotulo: 'Pesquisadores', icone: 'fa-user-graduate' },
] as const;

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function filtrarStatus(campanha: CampanhaResponse, filtro: FiltroStatus) {
  if (filtro === 'captacao') return campanha.status === 'ativo' && !emBreve(campanha);
  if (filtro === 'em-breve') return emBreve(campanha);
  if (filtro === 'financiados') return campanha.status === 'sucesso';
  return true;
}

export function Explorar({ auth }: PropsPagina) {
  const [parametros, setParametros] = useSearchParams();
  const [abaAtiva, setAbaAtiva] = useState<AbaExplorar>('projetos');
  const [pesquisadoresSolicitados, setPesquisadoresSolicitados] = useState(false);
  const { dado: campanhasRecebidas, carregando, erro } = useBuscar(
    () => campanhaApi.listar(auth.authFetch),
    [auth.authFetch],
  );
  const {
    dado: areasConhecimento,
    carregando: carregandoAreas,
    erro: erroAreas,
  } = useBuscar(() => areaConhecimentoApi.listarPublico(), []);
  const { dado: pesquisadoresRecebidos, carregando: carregandoPesquisadores, erro: erroPesquisadores } = useBuscar(
    async () => {
      if (!pesquisadoresSolicitados) return [];
      const perfis = await perfilPesquisadorApi.listar(auth.authFetch, { statusPesquisador: 'ativo' });
      const perfisOrdenados = [...perfis].sort(
        (a, b) => Date.parse(b.ativadoEm ?? '') - Date.parse(a.ativadoEm ?? ''),
      );
      // Nome e foto já vêm no perfil (uma consulta só; GET /usuario/:id exige login e permissão).
      return perfisOrdenados.map((perfil): { perfil: PerfilPesquisadorResponse } => ({ perfil }));
    },
    [auth.authFetch, pesquisadoresSolicitados],
  );
  const seguimento = useSeguirCampanhas(auth);
  const campanhas = useMemo(
    () => campanhasRecebidas?.filter(campanhaVisivelNoCatalogo) ?? null,
    [campanhasRecebidas],
  );
  const idAreaBaseParam = Number(parametros.get('areaBase'));
  const idAreaBase = Number.isSafeInteger(idAreaBaseParam) && idAreaBaseParam > 0 ? idAreaBaseParam : null;
  const carregandoConsulta = carregando || (idAreaBase !== null && carregandoAreas);
  const erroConsulta = erro || (idAreaBase !== null ? erroAreas : '');
  const [busca, setBusca] = useState('');
  const [areasSelecionadas, setAreasSelecionadas] = useState<string[]>(() => {
    const area = parametros.get('area');
    return area ? [area] : [];
  });
  const [status, setStatus] = useState<FiltroStatus>('todos');
  const [modelo, setModelo] = useState<FiltroModelo>('todos');
  const [ordenacao, setOrdenacao] = useState('recentes');
  const [buscaPesquisador, setBuscaPesquisador] = useState('');
  const [instituicaoPesquisador, setInstituicaoPesquisador] = useState('');
  const [nivelAcademico, setNivelAcademico] = useState<'todos' | TituloAcademico>('todos');
  const [modoLista, setModoLista] = useState(false);
  const [pagina, setPagina] = useState(1);

  const areas = useMemo(
    () => [...new Set((campanhas ?? []).map((campanha) => campanha.nomeArea).filter((nome): nome is string => Boolean(nome)))].sort(),
    [campanhas],
  );
  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtradas = (campanhas ?? []).filter((campanha) => {
      const texto = normalizar([campanha.titulo, campanha.descricao ?? '', campanha.nomePesquisador ?? '', campanha.nomeArea ?? ''].join(' '));
      return (
        (!termo || texto.includes(termo)) &&
        (idAreaBase === null ||
          areasConhecimento?.some(
            (area) => area.idAreaConhecimento === campanha.idAreaConhecimento && area.idPai === idAreaBase,
          ) === true) &&
        (areasSelecionadas.length === 0 || areasSelecionadas.includes(campanha.nomeArea ?? '')) &&
        filtrarStatus(campanha, status) &&
        (modelo === 'todos' || campanha.modelo === modelo)
      );
    });

    return filtradas.sort((a, b) => {
      if (ordenacao === 'percentual') return (percentualArrecadado(b) ?? 0) - (percentualArrecadado(a) ?? 0);
      if (ordenacao === 'prazo') {
        return Date.parse(a.dataFim ?? '9999-12-31') - Date.parse(b.dataFim ?? '9999-12-31');
      }
      return Date.parse(b.criadoEm) - Date.parse(a.criadoEm);
    });
  }, [areasConhecimento, areasSelecionadas, busca, campanhas, idAreaBase, modelo, ordenacao, status]);
  const tamanhoPagina = 12;
  const totalPaginas = Math.max(1, Math.ceil(resultados.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const resultadosPagina = resultados.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina);
  const instituicoes = useMemo(
    () =>
      [
        ...new Set(
          (pesquisadoresRecebidos ?? [])
            .map(({ perfil }) => perfil.vinculoInstitucional?.trim())
            .filter((instituicao): instituicao is string => Boolean(instituicao)),
        ),
      ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [pesquisadoresRecebidos],
  );
  const pesquisadoresFiltrados = useMemo(() => {
    const termo = normalizar(buscaPesquisador.trim());

    return (pesquisadoresRecebidos ?? []).filter(({ perfil }) => {
      return (
        (!termo || normalizar(perfil.nome ?? '').includes(termo)) &&
        (!instituicaoPesquisador || perfil.vinculoInstitucional?.trim() === instituicaoPesquisador) &&
        (nivelAcademico === 'todos' || perfil.tituloAcademico === nivelAcademico)
      );
    });
  }, [buscaPesquisador, instituicaoPesquisador, nivelAcademico, pesquisadoresRecebidos]);

  function limparFiltros() {
    const novosParametros = new URLSearchParams(parametros);
    novosParametros.delete('area');
    novosParametros.delete('areaBase');
    setParametros(novosParametros);
    setBusca('');
    setAreasSelecionadas([]);
    setStatus('todos');
    setModelo('todos');
  }

  function limparFiltrosPesquisadores() {
    setBuscaPesquisador('');
    setInstituicaoPesquisador('');
    setNivelAcademico('todos');
  }

  function trocarAba(aba: AbaExplorar) {
    setAbaAtiva(aba);
    if (aba === 'pesquisadores') setPesquisadoresSolicitados(true);
  }

  return (
    <main className="fundo-pagina py-10 min-h-full">
      <div className="w-full max-w-7xl mx-auto px-4">
        <CabecalhoPagina
          className="mb-8 border-b borda-padrao pb-5"
          id="cabecalho-pagina-explorar"
          titulo="Explore projetos e pesquisadores"
        >
          <p id="explorar-contagem" className="paragrafo-denso mt-3" aria-live="polite">
            {abaAtiva === 'projetos'
              ? carregandoConsulta
                ? 'Carregando projetos…'
                : `${resultados.length} ${resultados.length === 1 ? 'projeto' : 'projetos'} nesta consulta`
              : carregandoPesquisadores
                ? 'Carregando pesquisadores…'
                : `${pesquisadoresFiltrados.length} ${pesquisadoresFiltrados.length === 1 ? 'pesquisador' : 'pesquisadores'} nesta consulta`}
          </p>
        </CabecalhoPagina>

        <BarraAbasBotoes
          abas={[...ABAS_EXPLORAR]}
          ativa={abaAtiva}
          aoTrocar={trocarAba}
          className="mb-8"
        />

        {abaAtiva === 'projetos' ? (
        <section aria-labelledby="explorar-projetos-titulo" className="mb-16">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="explorar-projetos-titulo" className="titulo-secao">Projetos acadêmicos</h2>
              <p className="paragrafo texto-padrao mt-1">Descubra projetos incríveis e acompanhe pesquisas em andamento.</p>
            </div>
          </div>
          <section className="flex flex-col gap-5 mb-8" role="group" aria-label="Filtros de projetos">
          <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <BarraBuscaPublica
              id="explorar-busca"
              rotulo="Buscar por projeto, pesquisador ou área"
              placeholder="Buscar por projeto, pesquisador ou área…"
              valor={busca}
              aoAlterar={setBusca}
              className="w-full sm:max-w-xl"
            />

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center border borda-padrao rounded-lg overflow-hidden" role="group" aria-label="Modo de exibição">
                <button
                  aria-label="Ver em grade"
                  aria-pressed={!modoLista}
                  className={`w-9 h-9 flex items-center justify-center ${modoLista ? '' : 'fundo-realce texto-forte'}`}
                  onClick={() => setModoLista(false)}
                  type="button"
                >
                  <i className="fa-solid fa-grip" aria-hidden="true" />
                </button>
                <button
                  aria-label="Ver em lista"
                  aria-pressed={modoLista}
                  className={`w-9 h-9 flex items-center justify-center ${modoLista ? 'fundo-realce texto-forte' : ''}`}
                  onClick={() => setModoLista(true)}
                  type="button"
                >
                  <i className="fa-solid fa-list" aria-hidden="true" />
                </button>
              </div>
              <label className="rotulo flex items-center gap-2">
                Ordenar por
                <select className="input-padrao" value={ordenacao} onChange={(evento) => setOrdenacao(evento.target.value)}>
                  <option value="recentes">Mais recentes</option>
                  <option value="percentual">Maior percentual atingido</option>
                  <option value="prazo">Encerrando em breve</option>
                </select>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <GrupoFiltroExpansivel
              titulo="Área do conhecimento"
              opcoes={areas.map((nome) => ({ value: nome, label: nome }))}
              valoresSelecionados={areasSelecionadas}
              aoAlterar={setAreasSelecionadas}
              desabilitado={areas.length === 0}
              mensagemDesabilitado="As áreas do conhecimento serão exibidas quando houver campanhas públicas disponíveis."
            />
            <fieldset className="cartao fundo-cartao border borda-padrao rounded-xl p-4">
              <legend className="rotulo mb-3">Status</legend>
              <div className="flex flex-wrap gap-2">
                {([
                  ['todos', 'Todos'],
                  ['captacao', 'Em captação'],
                  ['em-breve', 'Em breve'],
                  ['financiados', 'Financiados'],
                ] as const).map(([valor, rotulo]) => (
                  <label className={`filtro-chip ${status === valor ? 'fundo-realce' : ''}`} key={valor}>
                    <input
                      className="sr-only"
                      checked={status === valor}
                      name="explorar-status"
                      onChange={() => setStatus(valor)}
                      type="radio"
                      value={valor}
                    />
                    {rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="cartao fundo-cartao border borda-padrao rounded-xl p-4">
              <legend className="rotulo mb-3">Modelo de financiamento</legend>
              <div className="flex flex-wrap gap-2">
                {([
                  ['todos', 'Todos'],
                  ['all-or-nothing', ROTULO_MODELO_CAMPANHA['all-or-nothing']],
                  ['flexivel', ROTULO_MODELO_CAMPANHA.flexivel],
                ] as const).map(([valor, rotulo]) => (
                  <label className={`filtro-chip ${modelo === valor ? 'fundo-realce' : ''}`} key={valor}>
                    <input
                      className="sr-only"
                      checked={modelo === valor}
                      name="explorar-modelo"
                      onChange={() => setModelo(valor)}
                      type="radio"
                      value={valor}
                    />
                    {rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-xs font-bold texto-marca hover:underline" onClick={limparFiltros}>
              Limpar filtros
            </button>
          </div>
        </section>

        {carregandoConsulta && <Carregando />}
        {!carregandoConsulta && erroConsulta && <MensagemErro texto={erroConsulta} />}
        {!carregandoConsulta && !erroConsulta && resultados.length === 0 && (
          <EstadoVazio
            acao={
              campanhas?.length ? (
                <button type="button" className="btn btn-secondary" onClick={limparFiltros}>
                  Limpar filtros
                </button>
              ) : undefined
            }
          >
            {campanhas?.length
              ? 'Nenhuma campanha corresponde aos filtros selecionados.'
              : 'Nenhuma campanha está disponível nesta consulta.'}
          </EstadoVazio>
        )}
        {!carregandoConsulta && !erroConsulta && resultados.length > 0 && (
          <div
            id="explorar-grade"
            className={`grade-campanhas ${modoLista ? 'explorar-grade--lista' : ''}`}
          >
            {resultadosPagina.map((campanha) => (
              <CartaoCampanha
                campanha={campanha}
                key={campanha.idCampanha}
                seguindo={seguimento.seguidas.has(campanha.idCampanha)}
                seguirDesabilitado={
                  seguimento.carregando || seguimento.emAtualizacao.has(campanha.idCampanha)
                }
                aoAlternarSeguir={seguimento.alternarSeguir}
              />
            ))}
          </div>
        )}
        {!carregandoConsulta && !erroConsulta && resultados.length > tamanhoPagina && (
          <nav id="explorar-paginacao" aria-label="Paginação das campanhas" className="mt-10 flex items-center justify-center gap-4">
            <button
              className="btn"
              disabled={paginaAtual === 1}
              onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
              type="button"
            >
              Anterior
            </button>
            <span className="paragrafo-denso" aria-live="polite">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <button
              className="btn"
              disabled={paginaAtual === totalPaginas}
              onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
              type="button"
            >
              Próxima
            </button>
          </nav>
        )}
          </section>
        ) : (

        <section aria-labelledby="explorar-pesquisadores-titulo" className="border-t borda-padrao pt-10">
          <div className="mb-6">
            <div>
              <h2 id="explorar-pesquisadores-titulo" className="titulo-secao">Pesquisadores ativos</h2>
              <p className="paragrafo texto-padrao mt-2 max-w-2xl">
                Encontre pesquisadores por nome, instituição ou nível acadêmico.
              </p>
            </div>
          </div>
          <section className="mb-8 flex flex-col gap-4" role="group" aria-label="Filtros de pesquisadores">
            {/* Mesma barra, mesma largura e linha própria da aba de projetos; os filtros vêm numa grade embaixo. */}
            <BarraBuscaPublica
              id="explorar-busca-pesquisador"
              rotulo="Buscar pelo nome do pesquisador"
              placeholder="Buscar pelo nome do pesquisador…"
              valor={buscaPesquisador}
              aoAlterar={setBuscaPesquisador}
              className="w-full sm:max-w-xl"
            />
            {/* Sem o filtro "Score mínimo" (16-11-2026, Lucas): palavra técnica, sem explicação para o público. */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="rotulo flex flex-col gap-2">
                Instituição
                <select
                  className="input-padrao"
                  value={instituicaoPesquisador}
                  onChange={(evento) => setInstituicaoPesquisador(evento.target.value)}
                >
                  <option value="">Todas as instituições</option>
                  {instituicoes.map((instituicao) => (
                    <option key={instituicao} value={instituicao}>{instituicao}</option>
                  ))}
                </select>
              </label>
              <label className="rotulo flex flex-col gap-2">
                Nível acadêmico
                <select
                  className="input-padrao"
                  value={nivelAcademico}
                  onChange={(evento) => setNivelAcademico(evento.target.value as 'todos' | TituloAcademico)}
                >
                  <option value="todos">Todos os níveis</option>
                  {Object.entries(ROTULO_TITULO_ACADEMICO).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>{rotulo}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs font-bold texto-marca hover:underline"
                onClick={limparFiltrosPesquisadores}
              >
                Limpar filtros
              </button>
            </div>
          </section>
          {carregandoPesquisadores ? (
            <Carregando />
          ) : erroPesquisadores ? (
            <MensagemErro texto={erroPesquisadores} />
          ) : pesquisadoresFiltrados.length ? (
            <div className="grade-pesquisadores">
              {pesquisadoresFiltrados.map(({ perfil }) => (
                <CartaoPesquisador key={perfil.idUsuario} perfil={perfil} />
              ))}
            </div>
          ) : (
            <EstadoVazio
              acao={
                pesquisadoresRecebidos?.length ? (
                  <button type="button" className="btn btn-secondary" onClick={limparFiltrosPesquisadores}>
                    Limpar filtros
                  </button>
                ) : undefined
              }
            >
              {pesquisadoresRecebidos?.length
                ? 'Nenhum pesquisador corresponde aos filtros selecionados.'
                : 'Nenhum pesquisador ativo está disponível no momento.'}
            </EstadoVazio>
          )}
        </section>
        )}
      </div>
    </main>
  );
}
