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
import { useDuvidasFrequentes } from './use-duvidas-frequentes';
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

// O avanço automático é da Alexia, de propósito: as campanhas se revezam no destaque, sem uma ficar sempre na frente.
// A WCAG 2.2.2 (nível A) não proíbe o movimento; exige um jeito de pausar (16-11-2026). Daí o botão Pausar/Continuar ao
// lado das setas. Quem pediu "menos movimento" no sistema operacional já não tem avanço automático, nem o botão.
const movimentoReduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Carrossel que gira sem fim (22-11-2026). Antes, no último cartão, o avanço automático rolava tudo de volta até o
// primeiro, e as setas paravam nas pontas: não parecia um carrossel. Agora a fileira aparece três vezes seguidas (a
// original e duas cópias) e a posição fica sempre na primeira volta: ao passar dela, o trilho pula uma volta inteira
// para trás SEM animação (behavior 'instant'); como as cópias são idênticas, o pulo não aparece. As cópias ficam
// `inert` e `aria-hidden`: leitor de tela e teclado veem cada campanha uma vez só. Só gira quando os cartões não cabem
// todos na tela; cabendo, fica parado, sem cópias. CARROSSEL_MUDOU avisa os controles (setas) quando isso muda.
const CARROSSEL_MUDOU = 'carrossel:mudou';
// Uma seta foi clicada: o giro contínuo espera alguns segundos.
const CARROSSEL_SETA = 'carrossel:seta';
// Velocidade do giro contínuo, em pixels por segundo (um cartão de 20rem leva uns 11 segundos para passar).
const VELOCIDADE_CARROSSEL = 30;
const COPIAS_CARROSSEL = 2;

// Largura de uma volta: do primeiro cartão até o primeiro cartão da primeira cópia. 0 = não gira.
function voltaDoTrilho(trilho: HTMLElement): number {
  const primeiro = trilho.firstElementChild as HTMLElement | null;
  const copia = trilho.querySelector<HTMLElement>('[data-copia="1"]');
  return primeiro && copia ? copia.offsetLeft - primeiro.offsetLeft : 0;
}

// Traz a posição de volta para a primeira volta, sem animação.
function normalizarTrilho(trilho: HTMLElement): void {
  const volta = voltaDoTrilho(trilho);
  if (volta > 0 && trilho.scrollLeft >= volta) {
    trilho.scrollTo({ left: trilho.scrollLeft - volta, behavior: 'instant' });
  }
}

// Um cartão: a distância entre o começo de um cartão e o do seguinte (a largura dele mais o espaço entre os dois).
function passoDoTrilho(trilho: HTMLElement): number {
  const primeiro = trilho.children[0] as HTMLElement | undefined;
  const segundo = trilho.children[1] as HTMLElement | undefined;
  return primeiro && segundo ? segundo.offsetLeft - primeiro.offsetLeft : trilho.clientWidth * 0.8;
}

// Seta e avanço automático: um cartão por vez, com rolagem suave (22-11-2026; antes eram 80% da largura visível, vários
// cartões de uma vez). Girando, voltar do começo pula antes uma volta para frente (sem animação), e o passo segue para
// trás na cópia.
function moverCarrossel(trilho: HTMLElement, direcao: -1 | 1): void {
  const passo = passoDoTrilho(trilho);
  const volta = voltaDoTrilho(trilho);
  if (volta > 0) {
    normalizarTrilho(trilho);
    if (direcao < 0 && trilho.scrollLeft < passo) {
      trilho.scrollTo({ left: trilho.scrollLeft + volta, behavior: 'instant' });
    }
  }
  trilho.scrollBy({ left: direcao * passo, behavior: 'smooth' });
}

function ControlesCarrossel({
  trilhoRef,
  rotulo,
  quantidade,
  desabilitado = false,
  pausado,
  aoAlternarPausa,
}: {
  trilhoRef: RefObject<HTMLDivElement | null>;
  rotulo: string;
  quantidade: number;
  desabilitado?: boolean;
  pausado: boolean;
  aoAlternarPausa: () => void;
}) {
  const [limites, setLimites] = useState({ inicio: true, fim: true });
  const atualizarLimites = useCallback(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    // Girando, as setas nunca apagam: sempre há o que ver para os dois lados.
    if (voltaDoTrilho(trilho) > 0) {
      setLimites({ inicio: false, fim: false });
      return;
    }
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
    trilho.addEventListener(CARROSSEL_MUDOU, atualizarLimites);
    window.addEventListener('resize', atualizarLimites);
    return () => {
      trilho.removeEventListener('scroll', atualizarLimites);
      trilho.removeEventListener(CARROSSEL_MUDOU, atualizarLimites);
      window.removeEventListener('resize', atualizarLimites);
    };
  }, [atualizarLimites, quantidade, trilhoRef]);

  function mover(direcao: -1 | 1) {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    // O giro contínuo para um pouco, para a seta mover um cartão sem o deslizar puxar junto.
    trilho.dispatchEvent(new Event(CARROSSEL_SETA));
    moverCarrossel(trilho, direcao);
  }

  return (
    <div className="carrossel-cartoes__controles" role="group" aria-label={`Navegar por ${rotulo}`}>
      {!movimentoReduzido() && quantidade > 1 && (
        <button
          aria-label={pausado ? `Continuar a passagem automática: ${rotulo}` : `Pausar a passagem automática: ${rotulo}`}
          aria-pressed={pausado}
          title={pausado ? 'Continuar' : 'Pausar'}
          className="carrossel-cartoes__seta"
          disabled={desabilitado}
          onClick={aoAlternarPausa}
          type="button"
        >
          <i className={`fa-solid ${pausado ? 'fa-play' : 'fa-pause'}`} aria-hidden="true" />
        </button>
      )}
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
  pausado,
}: {
  pausado: boolean;
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
  // Gira só quando os cartões não cabem todos na largura visível (medido sem as cópias, e de novo a cada resize).
  const [girando, setGirando] = useState(false);

  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho || carregando || erro || campanhas.length < 2) {
      setGirando(false);
      return;
    }
    const medir = () => {
      const volta = voltaDoTrilho(trilho);
      // Com as cópias na tela, a volta é a largura de uma fileira; sem elas, a fileira é o próprio scrollWidth.
      const larguraFileira = volta > 0 ? volta : trilho.scrollWidth;
      setGirando(larguraFileira > trilho.clientWidth + 1);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [campanhas.length, carregando, erro, trilhoRef]);

  // Avisa as setas e, depois de rolagem manual (dedo, roda do mouse), traz a posição de volta para a primeira volta.
  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    trilho.dispatchEvent(new Event(CARROSSEL_MUDOU));
    if (!girando) return;
    let espera = 0;
    const aoRolar = () => {
      window.clearTimeout(espera);
      espera = window.setTimeout(() => normalizarTrilho(trilho), 150);
    };
    trilho.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      window.clearTimeout(espera);
      trilho.removeEventListener('scroll', aoRolar);
    };
  }, [girando, trilhoRef]);

  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho || carregando || erro || campanhas.length < 2 || pausado || !girando) return;
    if (movimentoReduzido()) return;

    // Giro contínuo (22-11-2026): a fileira desliza devagar o tempo todo, como uma esteira, quadro a quadro
    // (requestAnimationFrame), a VELOCIDADE_CARROSSEL px por segundo. Enquanto desliza, o encaixe nos cartões e a rolagem
    // suave do CSS ficam desligados (a classe --deslizando): os dois brigariam com o movimento contínuo. `posicao` guarda
    // a posição com fração de pixel, porque o navegador arredonda o scrollLeft e um passo menor que 1 px nunca sairia
    // do lugar. Pausa com o mouse em cima, com o foco do teclado dentro, com a aba escondida e por alguns segundos
    // depois de uma seta ou de arrastar com o dedo (a do botão é a prop `pausado`).
    let pausaMomentanea = false;
    let pausadoAte = 0;
    let posicao = trilho.scrollLeft;
    let anterior = performance.now();
    let quadro = 0;
    const pausar = () => { pausaMomentanea = true; };
    const retomar = () => {
      pausaMomentanea = false;
      posicao = trilho.scrollLeft;
    };
    const pausarUmPouco = () => { pausadoAte = performance.now() + 3000; };

    const deslizar = (agora: number) => {
      const passado = Math.min(agora - anterior, 100);
      anterior = agora;
      if (!pausaMomentanea && !document.hidden && agora >= pausadoAte) {
        // Alguém rolou à mão (seta, dedo, roda do mouse): segue de onde o trilho está.
        if (Math.abs(trilho.scrollLeft - posicao) > 2) posicao = trilho.scrollLeft;
        posicao += (VELOCIDADE_CARROSSEL * passado) / 1000;
        const volta = voltaDoTrilho(trilho);
        if (volta > 0 && posicao >= volta) posicao -= volta;
        trilho.scrollLeft = posicao;
      }
      quadro = window.requestAnimationFrame(deslizar);
    };

    trilho.classList.add('carrossel-cartoes__trilho--deslizando');
    trilho.addEventListener('pointerenter', pausar);
    trilho.addEventListener('pointerleave', retomar);
    trilho.addEventListener('focusin', pausar);
    trilho.addEventListener('focusout', retomar);
    trilho.addEventListener('touchstart', pausarUmPouco, { passive: true });
    trilho.addEventListener(CARROSSEL_SETA, pausarUmPouco);
    quadro = window.requestAnimationFrame(deslizar);
    return () => {
      window.cancelAnimationFrame(quadro);
      trilho.classList.remove('carrossel-cartoes__trilho--deslizando');
      trilho.removeEventListener('pointerenter', pausar);
      trilho.removeEventListener('pointerleave', retomar);
      trilho.removeEventListener('focusin', pausar);
      trilho.removeEventListener('focusout', retomar);
      trilho.removeEventListener('touchstart', pausarUmPouco);
      trilho.removeEventListener(CARROSSEL_SETA, pausarUmPouco);
    };
  }, [campanhas.length, carregando, erro, trilhoRef, pausado, girando]);

  if (carregando) return <Carregando />;
  if (erro) return <MensagemErro texto={erro} />;
  if (campanhas.length === 0) return <EstadoVazio>{vazio}</EstadoVazio>;

  const cartao = (campanha: CampanhaResponse) => (
    <CartaoCampanha
      campanha={campanha}
      seguindo={seguidas.has(campanha.idCampanha)}
      seguirDesabilitado={carregandoSeguimento || emAtualizacao.has(campanha.idCampanha)}
      aoAlternarSeguir={aoAlternarSeguir}
    />
  );

  return (
    <div className="carrossel-cartoes">
      <div className="carrossel-cartoes__trilho" ref={trilhoRef}>
        {campanhas.map((campanha) => (
          <div className="carrossel-cartoes__item" key={campanha.idCampanha}>
            {cartao(campanha)}
          </div>
        ))}
        {girando &&
          Array.from({ length: COPIAS_CARROSSEL }, (_, copia) =>
            campanhas.map((campanha, indice) => (
              <div
                className="carrossel-cartoes__item"
                key={`copia-${copia + 1}-${campanha.idCampanha}`}
                data-copia={indice === 0 ? copia + 1 : undefined}
                inert
                aria-hidden="true"
              >
                {cartao(campanha)}
              </div>
            )),
          )}
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
  // As perguntas da Home são as marcadas `naHome` na FAQ (mesma fonte e mesmo texto da página /perguntas-frequentes).
  const duvidasHome = useDuvidasFrequentes().filter((duvida) => duvida.naHome);
  const campanhas = useMemo(
    () => campanhasRecebidas?.filter(campanhaVisivelNoCatalogo) ?? null,
    [campanhasRecebidas],
  );
  const carrosselDestaque = useRef<HTMLDivElement>(null);
  const carrosselEmBreve = useRef<HTMLDivElement>(null);
  const [pausadoDestaque, setPausadoDestaque] = useState(false);
  const [pausadoEmBreve, setPausadoEmBreve] = useState(false);
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

  return (
    <div id="view-home" className="view-section active flex-grow pagina-publica">
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
            <Link to="/criar-campanha" className="btn btn-grande veu-claro backdrop-blur-sm hover-veu-claro texto-sobre-escuro-forte">
              Submeter uma pesquisa
            </Link>
          </div>
        </div>
      </section>

      <section className="fundo-cartao border-b borda-padrao py-16">
        <div className="largura-site w-full">
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

      <section className="largura-site w-full pt-10 pb-2">
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
          {/* Mesmo cabeçalho do Em Breve (23-11-2026): título e controles na mesma linha também no celular. Antes era
              flex-col abaixo de 640px e os controles caíam pra linha de baixo; a contagem "N projetos" saiu. */}
          <div className="flex justify-between items-center mb-8 gap-4">
            <h2 className="titulo-secao texto-forte">Em Alta</h2>
            <div className="flex items-center gap-3">
              <ControlesCarrossel
                desabilitado={Boolean(erro) || carregando}
                quantidade={projetosDestaque.length}
                rotulo="projetos em alta"
                trilhoRef={carrosselDestaque}
                pausado={pausadoDestaque}
                aoAlternarPausa={() => setPausadoDestaque((atual) => !atual)}
              />
            </div>
          </div>
          <BlocoCampanhas
            campanhas={projetosDestaque}
            carregando={carregando}
            erro={erro}
            vazio="Nenhuma campanha está em captação no momento."
            trilhoRef={carrosselDestaque}
            pausado={pausadoDestaque}
            seguidas={seguimento.seguidas}
            carregandoSeguimento={seguimento.carregando}
            emAtualizacao={seguimento.emAtualizacao}
            aoAlternarSeguir={seguimento.alternarSeguir}
          />
          <div className="mt-12 text-center">
            <Link to="/explorar" className="btn btn-secondary btn-grande">
              Ver todos os projetos
            </Link>
          </div>
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
            pausado={pausadoEmBreve}
            aoAlternarPausa={() => setPausadoEmBreve((atual) => !atual)}
          />
        </div>
        <BlocoCampanhas
          campanhas={futuras.slice(0, 8)}
          carregando={carregando}
          erro={erro}
          vazio="Sem campanhas em breve no momento."
          trilhoRef={carrosselEmBreve}
          pausado={pausadoEmBreve}
          seguidas={seguimento.seguidas}
          carregandoSeguimento={seguimento.carregando}
          emAtualizacao={seguimento.emAtualizacao}
          aoAlternarSeguir={seguimento.alternarSeguir}
        />
      </section>

      <section className="superficie-escura texto-sobre-escuro-forte py-14 relative overflow-hidden">
        <div className="absolute inset-0 grade-medicao" aria-hidden="true" />
        <div className="largura-site w-full grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
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
        <div className="largura-site w-full home-como__grade">
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
            {duvidasHome.map((duvida) => (
              <details className="home-perguntas__item" key={duvida.chave}>
                <summary className="home-perguntas__pergunta">{duvida.pergunta}<i className="fa-solid fa-plus" aria-hidden="true" /></summary>
                <p className="paragrafo texto-padrao">{duvida.resposta}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/perguntas-frequentes" className="inline-flex items-center gap-2 texto-marca font-bold hover:underline">
              Ver todas as perguntas <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-pesquisadores">
        <img src="/imagens/faixa-pesquisadores.jpg" alt="" className="home-pesquisadores__foto" />
        <div className="home-pesquisadores__veu" aria-hidden="true" />
        <div className="largura-site w-full py-20 relative z-10">
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
    </div>
  );
}