import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { Carregando } from '../../components/layout/carregando';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { BarraBuscaPublica } from '../../components/search/barra-busca-publica';
import { GrupoFiltroExpansivel } from '../../components/search/grupo-filtro-expansivel';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import {
  emBreve,
  ROTULO_MODELO_CAMPANHA,
} from '../../services/12-campanha/constants/status-campanha.constants';
import type { ModeloCampanha } from '../../services/12-campanha/type/campanha.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import type { PropsPagina } from '../../services/router/pagina.type';
import { CartaoCampanha, EstadoVazio } from './componentes-campanhas';
import { campanhaVisivelNoCatalogo, percentualArrecadado } from './util-campanhas';
import { useSeguirCampanhas } from './use-seguir-campanhas';

type FiltroStatus = 'todos' | 'captacao' | 'em-breve' | 'financiados';
type FiltroModelo = 'todos' | ModeloCampanha;

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
  const { dado: campanhasRecebidas, carregando, erro } = useBuscar(
    () => campanhaApi.listar(auth.authFetch),
    [auth.authFetch],
  );
  const {
    dado: areasConhecimento,
    carregando: carregandoAreas,
    erro: erroAreas,
  } = useBuscar(() => areaConhecimentoApi.listarPublico(), []);
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

  return (
    <main className="fundo-pagina py-10 min-h-full">
      <div className="w-full max-w-7xl mx-auto px-4">
        <CabecalhoPagina
          className="mb-8 border-b borda-padrao pb-5"
          id="cabecalho-pagina-explorar"
          titulo="Explorar campanhas"
        >
          <p id="explorar-contagem" className="paragrafo-denso mt-3" aria-live="polite">
            {carregandoConsulta ? 'Carregando campanhas…' : `${resultados.length} campanhas nesta consulta`}
          </p>
        </CabecalhoPagina>

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
          <EstadoVazio>
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
      </div>
    </main>
  );
}
