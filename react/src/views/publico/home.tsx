import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link } from 'react-router';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { Carregando } from '../../components/layout/carregando';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { emBreve } from '../../services/12-campanha/constants/status-campanha.constants';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import type { PropsPagina } from '../../services/router/pagina.type';
import { CartaoCampanha, EstadoVazio } from './componentes-campanhas';
import { campanhaVisivelNoCatalogo, formatarNumeroCompacto, percentualArrecadado } from './util-campanhas';
import { useSeguirCampanhas } from './use-seguir-campanhas';

function iconeDaArea(nome: string) {
  const area = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  if (area.includes('biologic')) return 'fa-dna';
  if (area.includes('saude')) return 'fa-heart-pulse';
  if (area.includes('human')) return 'fa-people-group';
  if (area.includes('exata') || area.includes('engenharia')) return 'fa-atom';
  return 'fa-flask';
}

function porArrecadacao(campanhas: CampanhaResponse[]) {
  return [...campanhas].sort(
    (a, b) => (percentualArrecadado(b) ?? 0) - (percentualArrecadado(a) ?? 0),
  );
}

function ControlesCarrossel({
  trilhoRef,
  rotulo,
  quantidade,
  desabilitado = false,
}: {
  trilhoRef: RefObject<HTMLDivElement | null>;
  rotulo: string;
  quantidade: number;
  desabilitado?: boolean;
}) {
  const [limites, setLimites] = useState({ inicio: true, fim: true });
  const atualizarLimites = useCallback(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    setLimites({
      inicio: trilho.scrollLeft <= 1,
      fim: trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 1,
    });
  }, [trilhoRef]);

  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    atualizarLimites();
    trilho.addEventListener('scroll', atualizarLimites, { passive: true });
    window.addEventListener('resize', atualizarLimites);
    return () => {
      trilho.removeEventListener('scroll', atualizarLimites);
      window.removeEventListener('resize', atualizarLimites);
    };
  }, [atualizarLimites, quantidade, trilhoRef]);

  function mover(direcao: -1 | 1) {
    const trilho = trilhoRef.current;
    trilho?.scrollBy({ left: direcao * trilho.clientWidth * 0.8, behavior: 'smooth' });
  }

  return (
    <div className="carrossel-cartoes__controles" role="group" aria-label={`Navegar por ${rotulo}`}>
      <button
        aria-label={`Itens anteriores: ${rotulo}`}
        className="carrossel-cartoes__seta"
        disabled={desabilitado || quantidade === 0 || limites.inicio}
        onClick={() => mover(-1)}
        type="button"
      >
        <i className="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>
      <button
        aria-label={`Próximos itens: ${rotulo}`}
        className="carrossel-cartoes__seta"
        disabled={desabilitado || quantidade === 0 || limites.fim}
        onClick={() => mover(1)}
        type="button"
      >
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}

function nosUltimosSeteDias(campanha: CampanhaResponse) {
  if (!campanha.dataFim || campanha.status !== 'ativo' || emBreve(campanha)) return false;
  const dias = (Date.parse(campanha.dataFim) - Date.now()) / 86_400_000;
  return dias >= 0 && dias <= 7;
}

function BlocoCampanhas({
  campanhas,
  carregando,
  erro,
  vazio,
  trilhoRef,
  seguidas,
  carregandoSeguimento,
  emAtualizacao,
  aoAlternarSeguir,
}: {
  campanhas: CampanhaResponse[];
  carregando: boolean;
  erro: string | null;
  vazio: string;
  trilhoRef: RefObject<HTMLDivElement | null>;
  seguidas: ReadonlySet<number>;
  carregandoSeguimento: boolean;
  emAtualizacao: ReadonlySet<number>;
  aoAlternarSeguir: (idCampanha: number, titulo: string) => void;
}) {
  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho || carregando || erro || campanhas.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let pausado = false;
    const pausar = () => { pausado = true; };
    const retomar = () => { pausado = false; };
    const avancar = () => {
      if (pausado || document.hidden || trilho.scrollWidth <= trilho.clientWidth) return;
      const noFim = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 2;
      trilho.scrollTo({
        left: noFim ? 0 : trilho.scrollLeft + trilho.clientWidth * 0.8,
        behavior: 'smooth',
      });
    };

    trilho.addEventListener('pointerenter', pausar);
    trilho.addEventListener('pointerleave', retomar);
    trilho.addEventListener('focusin', pausar);
    trilho.addEventListener('focusout', retomar);
    const intervalo = window.setInterval(avancar, 5000);
    return () => {
      window.clearInterval(intervalo);
      trilho.removeEventListener('pointerenter', pausar);
      trilho.removeEventListener('pointerleave', retomar);
      trilho.removeEventListener('focusin', pausar);
      trilho.removeEventListener('focusout', retomar);
    };
  }, [campanhas.length, carregando, erro, trilhoRef]);

  if (carregando) return <Carregando />;
  if (erro) return <MensagemErro texto={erro} />;
  if (campanhas.length === 0) return <EstadoVazio>{vazio}</EstadoVazio>;

  return (
    <div className="carrossel-cartoes">
      <div className="carrossel-cartoes__trilho" ref={trilhoRef}>
        {campanhas.map((campanha) => (
          <CartaoCampanha
            campanha={campanha}
            key={campanha.idCampanha}
            seguindo={seguidas.has(campanha.idCampanha)}
            seguirDesabilitado={carregandoSeguimento || emAtualizacao.has(campanha.idCampanha)}
            aoAlternarSeguir={aoAlternarSeguir}
          />
        ))}
      </div>
    </div>
  );
}

export function Home({ auth }: PropsPagina) {
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
  const carrosselDestaque = useRef<HTMLDivElement>(null);
  const carrosselUltimosDias = useRef<HTMLDivElement>(null);
  const carrosselEmBreve = useRef<HTMLDivElement>(null);
  const areas = useMemo(() => {
    const idsAreasEmCampanhas = new Set((campanhas ?? []).map((campanha) => campanha.idAreaConhecimento));
    return (areasConhecimento ?? [])
      .filter((area) => area.idPai === null)
      .filter((raiz) =>
        (areasConhecimento ?? []).some(
          (area) => area.idPai === raiz.idAreaConhecimento && idsAreasEmCampanhas.has(area.idAreaConhecimento),
        ),
      );
  }, [areasConhecimento, campanhas]);
  const captacao = useMemo(
    () => porArrecadacao((campanhas ?? []).filter(
      (campanha) => campanha.status === 'ativo' && !emBreve(campanha),
    )),
    [campanhas],
  );
  const projetosDestaque = captacao.slice(0, 8);
  const ultimosDias = useMemo(
    () => porArrecadacao((campanhas ?? []).filter(nosUltimosSeteDias)),
    [campanhas],
  );
  const futuras = useMemo(
    () => (campanhas ?? []).filter(emBreve).sort(
      (a, b) => Date.parse(a.dataInicio ?? '') - Date.parse(b.dataInicio ?? ''),
    ),
    [campanhas],
  );
  const numeroPesquisadores = new Set((campanhas ?? []).map((campanha) => campanha.idUsuario)).size;
  const totalArrecadado = (campanhas ?? []).reduce(
    (total, campanha) => total + campanha.valorBrutoArrecadado,
    0,
  );
  const valorEstatistica = (valor: string | number) =>
    carregando ? '…' : erro ? 'Indisponível' : valor;
  const rotuloProjetosDestaque = () => {
    if (carregando) return 'Carregando projetos…';
    if (erro) return 'Projetos indisponíveis';
    return `${projetosDestaque.length} ${projetosDestaque.length === 1 ? 'projeto' : 'projetos'}`;
  };

  return (
    <main id="view-home" className="view-section active flex-grow pagina-publica">
      <section className="superficie-escura py-32 relative overflow-hidden">
        <div className="absolute inset-0 grade-medicao" aria-hidden="true" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 veu-claro backdrop-blur-sm texto-marca-sobre-escuro microrrotulo px-4 py-2 rounded-full mb-7">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            Perfil acadêmico público · Curadoria em toda campanha
          </span>
          <h1 className="titulo-hero texto-sobre-escuro-forte mb-8">
            Financie a próxima <br />descoberta <span className="texto-marca-sobre-escuro">brasileira</span>.
          </h1>
          <p className="paragrafo texto-sobre-escuro-forte mb-10 max-w-2xl mx-auto">
            Conheça projetos publicados por pesquisadores, consulte as informações de
            cada campanha e acompanhe os avanços compartilhados.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/explorar" className="btn btn-primary btn-grande shadow-marca hover:-translate-y-0.5">
              Ver projetos em captação
            </Link>
            <Link to="/cadastro" className="btn btn-grande veu-claro backdrop-blur-sm hover-veu-claro texto-sobre-escuro-forte">
              Submeter uma pesquisa
            </Link>
          </div>
        </div>
      </section>

      <section className="fundo-cartao border-b borda-padrao py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="microrrotulo texto-marca">Informações públicas</span>
            <h2 className="titulo-secao texto-forte mt-3">Um ambiente confiável para a ciência</h2>
          </div>
          <div className="home-confianca">
            {[
              ['fa-user-check', 'Pesquisadores identificados', 'A campanha exibe o nome do pesquisador quando essa informação está disponível.'],
              ['fa-clipboard-check', 'Campanhas avaliadas', 'As campanhas publicadas passaram pelo fluxo de avaliação da plataforma.'],
              ['fa-list-check', 'Informações do projeto', 'Consulte meta, valores arrecadados e datas informadas em cada campanha.'],
              ['fa-arrows-rotate', 'Acompanhamento', 'Atualizações públicas ficam disponíveis na página da campanha quando publicadas.'],
            ].map(([icone, titulo, texto]) => (
              <article className="home-confianca__item" key={titulo}>
                <span className="home-icone" aria-hidden="true">
                  <i className={`fa-solid ${icone}`} />
                </span>
                <h3 className="subtitulo">{titulo}</h3>
                <p className="paragrafo texto-padrao">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pt-10 pb-2">
        <h2 className="titulo-secao texto-forte mb-6 text-center">Explore comunidades incríveis</h2>
        {carregando && <Carregando className="text-center" />}
        {!carregando && erro && <MensagemErro texto={erro} />}
        {!carregando && !erro && areas.length > 0 && (
          <div className="home-comunidades">
            {areas.map((area) => (
              <Link
                className="home-comunidade"
                key={area.idAreaConhecimento}
                to={`/explorar?areaBase=${area.idAreaConhecimento}`}
              >
                <span className="home-comunidade__icone" aria-hidden="true">
                  <i className={`fa-solid ${iconeDaArea(area.nome)}`} />
                </span>
                <span>{area.nome}</span>
              </Link>
            ))}
          </div>
        )}
        {!carregandoAreas && erroAreas && <MensagemErro texto={erroAreas} />}
        {!carregando && !erro && !carregandoAreas && !erroAreas && areas.length === 0 && (
          <p className="paragrafo texto-fraco text-center">
            As comunidades serão exibidas quando campanhas públicas forem vinculadas às áreas de conhecimento.
          </p>
        )}
      </section>

      <section id="projetos" className="max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 xl:px-20 py-20">
        <div className="mb-16">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="titulo-secao texto-forte">Em Alta</h2>
              <p className="text-sm texto-fraco mt-1" aria-live="polite">{rotuloProjetosDestaque()}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ControlesCarrossel
                desabilitado={Boolean(erro) || carregando}
                quantidade={projetosDestaque.length}
                rotulo="projetos em alta"
                trilhoRef={carrosselDestaque}
              />
            </div>
          </div>
          <BlocoCampanhas
            campanhas={projetosDestaque}
            carregando={carregando}
            erro={erro}
            vazio="Nenhuma campanha está em captação no momento."
            trilhoRef={carrosselDestaque}
            seguidas={seguimento.seguidas}
            carregandoSeguimento={seguimento.carregando}
            emAtualizacao={seguimento.emAtualizacao}
            aoAlternarSeguir={seguimento.alternarSeguir}
          />
          <div className="mt-12 text-center">
            <Link to="/explorar" className="fundo-cartao border-2 borda-padrao texto-padrao font-bold py-3 px-8 rounded-xl hover-fundo-sutil hover-borda-forte hover-texto-forte transition-all shadow-sm">
              Ver todos os projetos
            </Link>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-8 gap-4">
            <h2 className="titulo-secao texto-forte">Últimos Dias</h2>
            <ControlesCarrossel
              desabilitado={Boolean(erro) || carregando}
              quantidade={ultimosDias.length}
              rotulo="campanhas encerrando em breve"
              trilhoRef={carrosselUltimosDias}
            />
          </div>
          <BlocoCampanhas
            campanhas={ultimosDias.slice(0, 8)}
            carregando={carregando}
            erro={erro}
            vazio="Não há campanhas ativas com encerramento previsto para os próximos sete dias."
            trilhoRef={carrosselUltimosDias}
            seguidas={seguimento.seguidas}
            carregandoSeguimento={seguimento.carregando}
            emAtualizacao={seguimento.emAtualizacao}
            aoAlternarSeguir={seguimento.alternarSeguir}
          />
        </div>
      </section>

      <section id="home-secao-em-breve" className="max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 xl:px-20 pb-20">
        <div className="flex justify-between items-center mb-8 gap-4">
          <h2 className="titulo-secao texto-forte">Em Breve</h2>
          <ControlesCarrossel
            desabilitado={Boolean(erro) || carregando}
            quantidade={futuras.length}
            rotulo="campanhas futuras"
            trilhoRef={carrosselEmBreve}
          />
        </div>
        <BlocoCampanhas
          campanhas={futuras.slice(0, 8)}
          carregando={carregando}
          erro={erro}
          vazio="Nenhuma campanha aprovada tem início futuro informado no momento."
          trilhoRef={carrosselEmBreve}
          seguidas={seguimento.seguidas}
          carregandoSeguimento={seguimento.carregando}
          emAtualizacao={seguimento.emAtualizacao}
          aoAlternarSeguir={seguimento.alternarSeguir}
        />
      </section>

      <section className="superficie-escura texto-sobre-escuro-forte py-14 relative overflow-hidden">
        <div className="absolute inset-0 grade-medicao" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <article className="home-stat">
            <div className="home-stat__valor">{valorEstatistica(formatarNumeroCompacto(campanhas?.length ?? 0))}</div>
            <div className="rotulo">Campanhas públicas</div>
          </article>
          <article className="home-stat">
            <div className="home-stat__valor">{valorEstatistica(formatarNumeroCompacto(numeroPesquisadores))}</div>
            <div className="rotulo">Pesquisadores</div>
          </article>
          <article className="home-stat">
            <div className="home-stat__valor">
              {valorEstatistica(formatarNumeroCompacto(totalArrecadado, true))}
            </div>
            <div className="rotulo">Arrecadado nas campanhas</div>
          </article>
        </div>
      </section>

      <section className="fundo-cartao home-como">
        <div className="max-w-7xl mx-auto px-4 home-como__grade">
          <div className="home-como__texto">
            <span className="microrrotulo texto-marca">Como funciona</span>
            <h2 className="titulo-secao texto-forte mt-3 mb-10">É simples conhecer uma pesquisa</h2>
            <ol className="home-passos">
              {[
                ['01', 'Conheça a proposta', 'Leia o objetivo, o orçamento e o cronograma disponíveis na campanha.'],
                ['02', 'Consulte as informações', 'Confira os dados publicados pelo pesquisador e a situação da campanha.'],
                ['03', 'Acompanhe o projeto', 'Veja as atualizações que o pesquisador publicar ao longo do projeto.'],
              ].map(([numero, titulo, texto]) => (
                <li className="home-passos__item" key={numero}>
                  <span className="home-passos__numero">{numero}</span>
                  <div>
                    <h3 className="subtitulo">{titulo}</h3>
                    <p className="paragrafo texto-padrao mt-2">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <figure className="home-celular" aria-hidden="true">
            <img src="/imagens/faixa-como-funciona.jpg" alt="" className="home-celular__foto" />
          </figure>
        </div>
      </section>

      <section className="fundo-cartao border-t borda-padrao py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="microrrotulo texto-marca">Perguntas frequentes</span>
            <h2 className="titulo-secao texto-forte mt-3">Antes de conhecer uma campanha</h2>
          </div>
          <div className="home-perguntas">
            <details className="home-perguntas__item">
              <summary className="home-perguntas__pergunta">Que informações encontro em uma campanha?<i className="fa-solid fa-plus" aria-hidden="true" /></summary>
              <p className="paragrafo texto-padrao">A página apresenta os dados publicados pelo pesquisador, como descrição, meta, orçamento e cronograma quando disponíveis.</p>
            </details>
            <details className="home-perguntas__item">
              <summary className="home-perguntas__pergunta">Como acompanho o andamento do projeto?<i className="fa-solid fa-plus" aria-hidden="true" /></summary>
              <p className="paragrafo texto-padrao">Consulte a página da campanha e suas atualizações públicas. Se ainda não houver atualizações, essa informação será indicada na própria página.</p>
            </details>
            <details className="home-perguntas__item">
              <summary className="home-perguntas__pergunta">Como apoio financeiramente?<i className="fa-solid fa-plus" aria-hidden="true" /></summary>
              <p className="paragrafo texto-padrao">A opção de apoio financeiro ainda não está disponível nesta versão pública do aplicativo.</p>
            </details>
          </div>
          <div className="text-center mt-8">
            <Link to="/como-funciona" className="inline-flex items-center gap-2 texto-marca font-bold hover:underline">
              Saiba como funciona <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-pesquisadores">
        <img src="/imagens/faixa-pesquisadores.jpg" alt="" className="home-pesquisadores__foto" />
        <div className="home-pesquisadores__veu" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-4 py-20 relative z-10">
          <span className="microrrotulo texto-marca-sobre-escuro">Para pesquisadores</span>
          <h2 className="titulo-secao texto-sobre-escuro-forte mt-3 mb-4">Sua pesquisa pode ir mais longe</h2>
          <p className="paragrafo texto-sobre-escuro-forte mb-8 max-w-xl">
            Apresente seu projeto com meta, orçamento e cronograma para que a comunidade
            conheça a pesquisa e acompanhe as informações publicadas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/cadastro" className="btn btn-primary btn-grande shadow-marca hover:-translate-y-0.5">
              Criar minha conta
            </Link>
            <Link to="/como-funciona" className="btn btn-grande veu-claro backdrop-blur-sm hover-veu-claro texto-sobre-escuro-forte">
              Saiba como funciona
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
