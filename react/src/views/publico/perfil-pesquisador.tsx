import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { ROTULO_TIPO_VINCULO, ROTULO_TITULO_ACADEMICO } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type {
  PerfilPesquisadorResponse,
  PerfilPesquisadorResponseScore,
} from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import { seguirPesquisadorApi } from '../../services/16-seguir/api/seguir-pesquisador.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import { ModalDenunciar } from '../19-denuncia/modal-denunciar';
import { CartaoCampanha } from './componentes-campanhas';
import { ListaAtualizacoes } from './lista-atualizacoes';
import { formatarData, ordenarAtualizacoes } from './util-campanhas';
import { LinkAcademicoExterno } from './links-academicos';
import { useLinksAcademicos } from './use-links-academicos';

interface DadosPagina {
  idUsuario: string;
  perfil: PerfilPesquisadorResponse | null;
  campanhas: CampanhaResponse[] | null;
  score: PerfilPesquisadorResponseScore | null;
}

interface EstadoSeguimento {
  chave: string;
  seguidores: number | null;
  seguindo: boolean | null;
  enviando: boolean;
}

// Página pública do pesquisador (ajustes de 14-11-2026, lista do Lucas e da Alexia): foto grande no topo, Seguir com
// um menu ao lado (denunciar o perfil, copiar o link), pontuação no cartão lateral, formação e vínculo em pílulas,
// campanhas separadas em ativas e encerradas, e as publicações (as atualizações de todas as campanhas dele, a mais
// recente em cima).
function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : (partes[0] ?? '?').slice(0, 2);
  return letras.toLocaleUpperCase('pt-BR');
}

export function PerfilPesquisador({ auth }: PropsPagina) {
  const { idUsuario } = useParams();
  const navegar = useNavigate();
  const { mostrar } = useToast();
  const [pagina, setPagina] = useState<DadosPagina | null>(null);
  const [publicacoes, setPublicacoes] = useState<{ chave: string; lista: AtualizacaoCampanhaResponse[] | null } | null>(null);
  const [seguimento, setSeguimento] = useState<EstadoSeguimento | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [denunciando, setDenunciando] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const id = Number(idUsuario);
  const idValido = idUsuario !== undefined && /^\d+$/.test(idUsuario) && Number.isSafeInteger(id) && id > 0;
  const dados = pagina?.idUsuario === idUsuario ? pagina : null;
  const carregando = idValido && dados === null;
  const perfil = dados?.perfil ?? null;
  // Nome e foto vêm do próprio perfil (GET /usuario/:id exige login e permissão: visitante ficava sem nome).
  const pesquisador = perfil ? { nome: perfil.nome, avatarUrl: perfil.avatarUrl } : null;
  const campanhas = dados?.campanhas ?? null;
  const score = dados?.score ?? null;
  const naoEncontrado = !idValido || (!carregando && perfil === null);
  const idVisualizador = auth.usuario?.idUsuario ?? null;
  const ehProprio = idVisualizador === id;
  const chaveSeguimento = `${id}:${idVisualizador ?? 0}`;
  const links = useLinksAcademicos(auth.authFetch, perfil ? id : null);
  const dadosSeguimento = seguimento?.chave === chaveSeguimento ? seguimento : null;

  useEffect(() => {
    if (!idValido) return;
    let ativo = true;
    void Promise.allSettled([
      perfilPesquisadorApi.buscar(auth.authFetch, id),
      campanhaApi.listar(auth.authFetch, { idUsuario: id }),
      perfilPesquisadorApi.buscarScore(auth.authFetch, id),
    ]).then(([rPerfil, rCampanhas, rScore]) => {
      if (!ativo) return;
      setPagina({
        idUsuario,
        perfil: rPerfil.status === 'fulfilled' ? rPerfil.value : null,
        campanhas: rCampanhas.status === 'fulfilled' ? rCampanhas.value : null,
        score: rScore.status === 'fulfilled' ? rScore.value : null,
      });
    });
    return () => {
      ativo = false;
    };
  }, [auth.authFetch, id, idValido, idUsuario]);

  // Atualizações: as atualizações de todas as campanhas do pesquisador, juntas e pela data.
  useEffect(() => {
    if (!campanhas || idUsuario === undefined) return;
    let ativo = true;
    void Promise.allSettled(campanhas.map((campanha) => atualizacaoCampanhaApi.listar(auth.authFetch, campanha.idCampanha))).then(
      (resultados) => {
        if (!ativo) return;
        const todas = resultados.flatMap((resultado) => (resultado.status === 'fulfilled' ? resultado.value : []));
        const falhouTudo = resultados.length > 0 && resultados.every((resultado) => resultado.status === 'rejected');
        setPublicacoes({ chave: idUsuario, lista: falhouTudo ? null : ordenarAtualizacoes(todas) });
      },
    );
    return () => {
      ativo = false;
    };
  }, [auth.authFetch, campanhas, idUsuario]);

  useEffect(() => {
    if (!idValido || auth.carregando) return;
    let ativo = true;
    void Promise.allSettled([
      seguirPesquisadorApi.contarSeguidores(auth.authFetch, id),
      auth.autenticado ? seguirPesquisadorApi.listarMinhas(auth.authFetch) : Promise.resolve(null),
    ]).then(([rContagem, rLista]) => {
      if (!ativo) return;
      setSeguimento({
        chave: chaveSeguimento,
        seguidores: rContagem.status === 'fulfilled' ? rContagem.value.seguidores : null,
        seguindo:
          rLista.status === 'fulfilled' && rLista.value !== null ? rLista.value.some((item) => item.idPesquisador === id) : null,
        enviando: false,
      });
    });
    return () => {
      ativo = false;
    };
  }, [auth.authFetch, auth.autenticado, auth.carregando, chaveSeguimento, id, idValido]);

  // Fecha o menu ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!menuAberto) return;
    const fecharFora = (evento: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(evento.target as Node)) setMenuAberto(false);
    };
    const fecharEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAberto(false);
    };
    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, [menuAberto]);

  async function alternarSeguir(): Promise<void> {
    if (!auth.autenticado) {
      // Só avisa, sem levar ao login (16-11-2026), como o Seguir das campanhas.
      mostrar('Entre na sua conta para seguir pesquisadores.', 'Depois de entrar, você volta para esta página.', 'aviso');
      return;
    }
    if (!dadosSeguimento || dadosSeguimento.seguindo === null || dadosSeguimento.enviando) return;
    const seguia = dadosSeguimento.seguindo;
    setSeguimento({ ...dadosSeguimento, enviando: true });
    try {
      if (seguia) await seguirPesquisadorApi.deixarDeSeguir(auth.authFetch, id);
      else await seguirPesquisadorApi.seguir(auth.authFetch, id);
      setSeguimento((atual) =>
        atual?.chave === chaveSeguimento
          ? {
              ...atual,
              seguindo: !seguia,
              enviando: false,
              seguidores: atual.seguidores === null ? null : Math.max(0, atual.seguidores + (seguia ? -1 : 1)),
            }
          : atual,
      );
    } catch (erro: unknown) {
      mostrar(traduzirErro(erro), undefined, 'erro');
      setSeguimento((atual) => (atual?.chave === chaveSeguimento ? { ...atual, enviando: false } : atual));
    }
  }

  async function copiarLink(): Promise<void> {
    setMenuAberto(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pesquisador/${id}`);
      mostrar('Link do perfil copiado.');
    } catch {
      mostrar('Não foi possível copiar. Copie o endereço pela barra do navegador.', undefined, 'erro');
    }
  }

  function denunciar(): void {
    setMenuAberto(false);
    if (!auth.autenticado) {
      void navegar('/login', { state: { voltarPara: `/pesquisador/${id}` } });
      return;
    }
    setDenunciando(true);
  }

  const ativas = campanhas?.filter((campanha) => campanha.status === 'ativo') ?? [];
  const encerradas = campanhas?.filter((campanha) => campanha.status !== 'ativo') ?? [];
  const lista = publicacoes !== null && publicacoes.chave === idUsuario ? publicacoes.lista : undefined;
  const tituloPorCampanha = new Map(campanhas?.map((campanha) => [campanha.idCampanha, campanha.titulo]) ?? []);
  const idsEncerradas = new Set(encerradas.map((campanha) => campanha.idCampanha));
  const nome = pesquisador?.nome ?? (carregando ? 'Carregando…' : 'Pesquisador');
  const pontuacao = score?.scoreTotal ?? perfil?.scoreAtual ?? null;

  const botaoSeguir = !ehProprio && (
    <div className="flex items-center gap-2" ref={menuRef}>
      <button
        type="button"
        // No topo escuro: Seguir em destaque (verde); Seguindo em véu translúcido, como as pílulas do topo.
        // Largura fixa (a de "Seguindo") e texto centralizado: trocar Seguir/Seguindo não empurra o botão do menu.
        className={`btn justify-center min-w-[9.5rem] ${dadosSeguimento?.seguindo ? 'veu-claro texto-sobre-escuro-forte hover:bg-white/15' : 'btn-primary'}`}
        aria-busy={dadosSeguimento?.enviando ?? false}
        disabled={auth.autenticado && (!dadosSeguimento || dadosSeguimento.seguindo === null || dadosSeguimento.enviando)}
        aria-pressed={dadosSeguimento?.seguindo ?? false}
        onClick={() => void alternarSeguir()}
      >
        {/* Enviando: o ícone vira um indicador girando, o texto não muda ("Atualizando…" era mais largo e fazia pular). */}
        <i
          className={dadosSeguimento?.enviando ? 'fa-solid fa-spinner fa-spin' : `fa-${dadosSeguimento?.seguindo ? 'solid' : 'regular'} fa-bell icone-sino`}
          aria-hidden="true"
        />
        {dadosSeguimento?.seguindo ? 'Seguindo' : 'Seguir'}
      </button>
      <div className="relative">
        <button
          type="button"
          className="btn veu-claro texto-sobre-escuro-forte hover:bg-white/15 px-3"
          aria-haspopup="menu"
          aria-expanded={menuAberto}
          aria-label="Mais opções do perfil"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <i className={`fa-solid fa-chevron-down transition-transform ${menuAberto ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {menuAberto && (
          <div role="menu" className="absolute left-0 top-full mt-2 w-60 fundo-cartao border borda-padrao rounded-xl shadow-xl py-1.5 z-30 overflow-hidden">
            <button type="button" role="menuitem" className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left texto-padrao hover-fundo-sutil transition-colors" onClick={() => void copiarLink()}>
              <i className="fa-solid fa-link w-4 text-center texto-fraco" aria-hidden="true" /> Copiar link do perfil
            </button>
            <button type="button" role="menuitem" className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left texto-erro hover-fundo-sutil transition-colors" onClick={denunciar}>
              <i className="fa-solid fa-flag w-4 text-center" aria-hidden="true" /> Denunciar perfil
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div id="view-perfil-pesquisador" className="pagina-publica view-section flex-grow fundo-pagina min-h-screen pb-16">
      {/* Sem overflow-hidden e numa camada acima (z-10): o menu do Seguir abre por cima do conteúdo, não por trás. */}
      <header id="perfil-pesquisador-capa" className="superficie-escura relative z-10 mb-10 py-14">
        {/* No celular, tudo centrado e a foto menor (16-11-2026, Alexia): alinhado à esquerda sobrava um vazio à direita. */}
        <div className="largura-site w-full flex flex-col items-center text-center sm:flex-row sm:text-left gap-6 sm:gap-8">
          <div className="shrink-0">
            {pesquisador?.avatarUrl ? (
              <img
                src={pesquisador.avatarUrl}
                alt={`Foto de ${nome}`}
                className="w-28 h-28 sm:w-44 sm:h-44 rounded-full object-cover border-4 border-white/20 shadow-2xl"
              />
            ) : (
              // Sem foto: as iniciais no MESMO tamanho da foto. Não usar scale: ele só aumenta o desenho, sem ocupar espaço,
              // e o círculo ficava por cima do nome ao lado.
              <span
                className="w-28 h-28 sm:w-44 sm:h-44 rounded-full flex items-center justify-center fundo-marca-forte texto-sobre-cor text-4xl sm:text-5xl font-bold border-4 border-white/20 shadow-2xl select-none"
                aria-hidden="true"
              >
                {iniciais(pesquisador?.nome)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="microrrotulo texto-marca-sobre-escuro mb-3">Perfil de pesquisador</p>
            <h1 className="titulo-pagina texto-sobre-escuro-forte">{nome}</h1>
            {perfil && (
              <ul className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4" aria-label="Formação e vínculo">
                <li className="veu-claro texto-sobre-escuro-forte microrrotulo px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                  <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
                  {ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico]}
                </li>
                <li className="veu-claro texto-sobre-escuro-forte microrrotulo px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                  <i className="fa-solid fa-building-columns" aria-hidden="true" />
                  {perfil.tipoVinculo === 'institucional' && perfil.vinculoInstitucional
                    ? perfil.vinculoInstitucional
                    : ROTULO_TIPO_VINCULO[perfil.tipoVinculo]}
                </li>
              </ul>
            )}
            {naoEncontrado && (
              <p className="paragrafo texto-sobre-escuro mt-4">Não encontramos um perfil público de pesquisador neste endereço.</p>
            )}
            {!naoEncontrado && <div className="mt-6 flex justify-center sm:justify-start">{botaoSeguir}</div>}
          </div>
        </div>
      </header>

      {!naoEncontrado && (
        <div className="largura-site w-full">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-10 lg:col-span-2">
              <SecaoCampanhas titulo="Campanhas ativas" campanhas={ativas} carregando={campanhas === null && carregando} vazio="Nenhuma campanha arrecadando agora." />
              <SecaoCampanhas titulo="Campanhas encerradas" campanhas={encerradas} carregando={campanhas === null && carregando} vazio="Nenhuma campanha encerrada." />

              <section id="perfil-pesquisador-publicacoes" aria-labelledby="perfil-publicacoes-titulo">
                <h2 id="perfil-publicacoes-titulo" className="titulo-secao mb-4">Atualizações</h2>
                {lista === undefined && <p className="paragrafo texto-fraco">Carregando…</p>}
                {lista === null && <p className="paragrafo texto-fraco">Não foi possível carregar as publicações.</p>}
                {lista && lista.length === 0 && <p className="paragrafo texto-fraco">Sem publicações recentes.</p>}
                {lista && lista.length > 0 && (
                  <ListaAtualizacoes
                    atualizacoes={lista}
                    tituloCampanha={(idCampanha) => tituloPorCampanha.get(idCampanha)}
                    campanhaEncerrada={(idCampanha) => idsEncerradas.has(idCampanha)}
                  />
                )}
              </section>
            </div>

            {/* No celular, o resumo (pontuação, seguidores, campanhas) vem antes das campanhas, não depois de tudo (Alexia). */}
            <aside className="order-first lg:order-none">
              <div className="pagina-publica__cartao cartao lg:sticky lg:top-24 space-y-5" id="perfil-pesquisador-cta">
                <h2 className="subtitulo">Acompanhe a pesquisa</h2>
                {/* RF-028: data de cadastro do perfil e links acadêmicos na ordem que o pesquisador definiu, com os rótulos. */}
                {perfil?.ativadoEm && (
                  <p className="paragrafo texto-fraco">
                    <i className="fa-solid fa-calendar-check mr-2" aria-hidden="true" />
                    Pesquisador na plataforma desde {formatarData(perfil.ativadoEm)}
                  </p>
                )}
                {links && links.length > 0 && (
                  <div>
                    <h3 className="rotulo mb-2">Links acadêmicos</h3>
                    <ul className="space-y-2">
                      {links.map((link) => (
                        <li key={link.idLinkAcademico} className="paragrafo">
                          <LinkAcademicoExterno link={link} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pontuacao !== null && (
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="rotulo">Pontuação acadêmica</span>
                      <span className="numero font-bold texto-forte">{Math.round(pontuacao)}/100</span>
                    </div>
                    <div
                      className="h-2 rounded-full fundo-realce overflow-hidden mt-2"
                      role="progressbar"
                      aria-label="Pontuação acadêmica"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(pontuacao)}
                    >
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, pontuacao))}%` }} />
                    </div>
                    {score?.rotulo && <p className="legenda mt-2 texto-fraco">{score.rotulo}</p>}
                  </div>
                )}
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="fundo-destaque rounded-xl px-1 py-3 border borda-padrao min-w-0 flex flex-col-reverse">
                    <dt className="legenda texto-fraco break-words leading-tight">Seguidores</dt>
                    <dd className="numero text-xl font-bold texto-forte">{dadosSeguimento?.seguidores ?? '—'}</dd>
                  </div>
                  <div className="fundo-destaque rounded-xl px-1 py-3 border borda-padrao min-w-0 flex flex-col-reverse">
                    <dt className="legenda texto-fraco break-words leading-tight">Ativas</dt>
                    <dd className="numero text-xl font-bold texto-forte">{campanhas ? ativas.length : '—'}</dd>
                  </div>
                  <div className="fundo-destaque rounded-xl px-1 py-3 border borda-padrao min-w-0 flex flex-col-reverse">
                    <dt className="legenda texto-fraco break-words leading-tight">Encerradas</dt>
                    <dd className="numero text-xl font-bold texto-forte">{campanhas ? encerradas.length : '—'}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </div>
      )}

      {denunciando && (
        <ModalDenunciar
          authFetch={auth.authFetch}
          alvo={{ idPesquisadorAlvo: id }}
          nomeAlvo={nome}
          aoFechar={() => setDenunciando(false)}
          aoDenunciado={() => {
            setDenunciando(false);
            mostrar('Denúncia registrada. A moderação vai analisar.');
          }}
        />
      )}
    </div>
  );
}

function SecaoCampanhas({
  titulo,
  campanhas,
  carregando,
  vazio,
}: {
  titulo: string;
  campanhas: CampanhaResponse[];
  carregando: boolean;
  vazio: string;
}) {
  return (
    <section>
      <h2 className="titulo-secao mb-4">{titulo}</h2>
      {carregando ? (
        <p className="paragrafo texto-fraco">Carregando…</p>
      ) : campanhas.length === 0 ? (
        <p className="paragrafo texto-fraco">{vazio}</p>
      ) : (
        <div className="grade-campanhas grid grid-cols-1 gap-4 sm:grid-cols-2">
          {campanhas.map((campanha) => (
            <CartaoCampanha campanha={campanha} key={campanha.idCampanha} />
          ))}
        </div>
      )}
    </section>
  );
}
