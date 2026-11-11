import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { Carregando } from '../../components/layout/carregando';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  classeBadgeCampanha,
  emBreve,
  EXPLICACAO_MODELO_CAMPANHA,
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
import { formatarData, formatarMoeda, percentualArrecadado } from './util-campanhas';

type AbaCampanha = 'sobre' | 'orcamento' | 'cronograma' | 'atualizacoes';

interface EstadoSecundario<T> {
  dados: T[];
  erro: boolean;
}

const VAZIO = { dados: [], erro: false };

function executarSeAtivo(ativo: boolean, acao: () => void) {
  if (ativo) acao();
}

function diasRestantes(dataFim: string | null) {
  if (!dataFim) return null;
  return Math.max(0, Math.ceil((Date.parse(dataFim) - Date.now()) / 86_400_000));
}

export function Campanha({ auth }: PropsPagina) {
  const { id } = useParams();
  const idCampanha = Number(id);
  const idValido = Number.isSafeInteger(idCampanha) && idCampanha > 0;
  const [campanha, setCampanha] = useState<CampanhaResponse | null>(null);
  const [orcamentos, setOrcamentos] = useState<EstadoSecundario<OrcamentoCampanhaResponse>>(VAZIO);
  const [marcos, setMarcos] = useState<EstadoSecundario<MarcoCronogramaResponse>>(VAZIO);
  const [atualizacoes, setAtualizacoes] = useState<EstadoSecundario<AtualizacaoCampanhaResponse>>(VAZIO);
  const [carregando, setCarregando] = useState(idValido);
  const [aba, setAba] = useState<AbaCampanha>('sobre');
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });

  useEffect(() => {
    if (!idValido) return;
    let ativo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    setCampanha(null);
    setOrcamentos(VAZIO);
    setMarcos(VAZIO);
    setAtualizacoes(VAZIO);
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

        const [orcamento, cronograma, novidades] = await Promise.allSettled([
          orcamentoCampanhaApi.listar(auth.authFetch, idCampanha),
          marcoCronogramaApi.listar(auth.authFetch, idCampanha),
          atualizacaoCampanhaApi.listar(auth.authFetch, idCampanha),
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
            dados: novidades.status === 'fulfilled' ? novidades.value.filter((atualizacao) => atualizacao.ativo) : [],
            erro: novidades.status === 'rejected',
          });
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
  }, [auth.authFetch, idCampanha, idValido]);

  const percentual = campanha ? percentualArrecadado(campanha) : null;
  const publicada = campanha ? STATUS_PUBLICADA.has(campanha.status) : false;
  const dias = campanha ? diasRestantes(campanha.dataFim) : null;
  const aceitaApoios = campanha !== null &&
    campanha.status === 'ativo' &&
    !emBreve(campanha) &&
    (campanha.dataFim === null || Date.parse(campanha.dataFim) > Date.now());
  const abas: { chave: AbaCampanha; rotulo: string }[] = [
    { chave: 'sobre', rotulo: 'Sobre o projeto' },
    { chave: 'orcamento', rotulo: 'Orçamento' },
    { chave: 'cronograma', rotulo: 'Cronograma' },
    { chave: 'atualizacoes', rotulo: 'Atualizações' },
  ];

  return (
    <main id="view-campanha" className="view-section flex-grow pagina-publica">
      {!idValido && <div className="max-w-7xl mx-auto px-4 py-10"><MensagemErro texto="O endereço da campanha é inválido." /></div>}
      {carregando && <div className="max-w-7xl mx-auto px-4 py-10"><Carregando /></div>}
      {!carregando && erro && <div className="max-w-7xl mx-auto px-4 py-10"><MensagemErro texto={erro} /></div>}
      {!carregando && !erro && campanha && (
        <>
          <section
            className="pt-14 pb-24 relative overflow-hidden texto-sobre-escuro superficie-escura"
            style={{ background: 'var(--cor-cianotipo-800)' }}
          >
            <div className="absolute inset-0 grade-medicao" aria-hidden="true" />
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <p className="text-sm font-medium texto-sobre-escuro mb-6 flex items-center gap-2">
                <Link className="inline-flex items-center gap-2 hover-texto-sobre-escuro-forte transition" to="/">
                  <i className="fa-solid fa-house text-xs" aria-hidden="true" />
                  Home
                </Link>
                <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true" />
                <span>{campanha.nomeArea ?? 'Campanha'}</span>
              </p>
              <span className="veu-claro texto-sobre-escuro-forte microrrotulo px-3 py-1.5 rounded-full mb-4 inline-flex items-center gap-2">
                <i className="fa-solid fa-flask" aria-hidden="true" />
                Projeto {ROTULO_MODELO_CAMPANHA[campanha.modelo]}
              </span>
              <div className="mb-4 flex">
                <span className={`badge ${classeBadgeCampanha(campanha)}`}>{rotuloStatusCampanha(campanha)}</span>
              </div>
              <h1 className="titulo-pagina texto-sobre-escuro-forte max-w-4xl mb-6">{campanha.titulo}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 texto-sobre-escuro text-sm font-medium">
                <Link className="flex items-center gap-2 hover:underline" to={`/pesquisador/${campanha.idUsuario}`}>
                  <span className="w-6 h-6 rounded-full fundo-marca-sobre-escuro flex items-center justify-center texto-sobre-escuro-forte font-bold text-xs" aria-hidden="true">
                    {campanha.nomePesquisador?.charAt(0).toLocaleUpperCase('pt-BR') ?? '?'}
                  </span>
                  {campanha.nomePesquisador ?? 'Pesquisador não informado'}
                </Link>
                <span aria-hidden="true" className="hidden sm:inline">|</span>
                <span className="inline-flex items-center gap-2 veu-claro texto-marca-sobre-escuro microrrotulo px-3 py-1 rounded-full">
                  {campanha.nomeArea ?? 'Área não informada'}
                </span>
              </div>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 -mt-16 pb-16 flex flex-col lg:flex-row gap-10 relative z-10">
            <div className="flex-1 min-w-0">
              <div className="w-full aspect-video bg-[var(--cor-cianotipo-900)] rounded-xl overflow-hidden relative flex items-center justify-center mb-10 shadow-2xl border-4 border-white">
                {campanha.videoApresentacaoUrl ? (
                  <a
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 texto-sobre-escuro-forte bg-black/50 hover:bg-black/60 transition-colors group"
                    href={campanha.videoApresentacaoUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:bg-primary transition-colors">
                      <i className="fa-solid fa-play text-white text-2xl ml-1" aria-hidden="true" />
                    </span>
                    <span className="microrrotulo">Assistir à apresentação do projeto</span>
                    <span className="absolute bottom-4 left-4 bg-white/90 texto-padrao microrrotulo px-3 py-1 rounded-full border borda-padrao">
                      Vídeo de apresentação
                    </span>
                  </a>
                ) : (
                  <div className="flex flex-col items-center gap-3 texto-sobre-escuro text-center px-6">
                    <i className="fa-solid fa-circle-play text-5xl opacity-70" aria-hidden="true" />
                    <p className="paragrafo texto-sobre-escuro-forte">
                      Vídeo de apresentação não disponível para esta campanha.
                    </p>
                  </div>
                )}
              </div>

              <div id="project-tab-buttons" role="tablist" aria-label="Detalhes da campanha" className="sticky top-sticky z-10 fundo-cartao rounded-xl shadow-sm border borda-padrao mb-8 p-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                {abas.map((item) => (
                  <button
                    aria-controls={`tab-${item.chave}`}
                    aria-selected={aba === item.chave}
                    className={`whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition-colors ${aba === item.chave ? 'fundo-realce texto-forte' : 'texto-padrao hover-fundo-sutil'}`}
                    id={`tab-btn-${item.chave}`}
                    key={item.chave}
                    onClick={() => setAba(item.chave)}
                    role="tab"
                    type="button"
                  >
                    {item.rotulo}
                  </button>
                ))}
              </div>

              <div className="fundo-cartao rounded-xl shadow-sm border borda-padrao p-8 md:p-10">
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
                      <ul className="flex flex-col divide-y divide-[var(--cor-borda)]">
                        {orcamentos.dados.map((item) => (
                          <li className="py-4 flex flex-wrap justify-between gap-3" key={item.idOrcamento}>
                            <div>
                              <h3 className="subtitulo">{item.categoria}</h3>
                              {item.descricao && <p className="paragrafo texto-padrao mt-1">{item.descricao}</p>}
                            </div>
                            <span className="paragrafo texto-forte font-bold">{formatarMoeda(item.valor)}</span>
                          </li>
                        ))}
                      </ul>
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
                      <ol className="flex flex-col gap-5">
                        {marcos.dados
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((marco) => (
                            <li className="border-l-2 borda-padrao pl-4" key={marco.idMarco}>
                              <p className="rotulo-leitura texto-marca">{formatarData(marco.dataPrevista)}</p>
                              <h3 className="subtitulo mt-1">{marco.titulo}</h3>
                              {marco.descricao && <p className="paragrafo texto-padrao mt-2">{marco.descricao}</p>}
                            </li>
                          ))}
                      </ol>
                    )}
                  </section>
                )}
                {aba === 'atualizacoes' && (
                  <section id="tab-atualizacoes" aria-labelledby="tab-btn-atualizacoes" role="tabpanel">
                    <h2 className="titulo-secao texto-forte mb-5">Atualizações</h2>
                    {!publicada && <p className="paragrafo texto-fraco">As atualizações públicas ainda não estão disponíveis para esta campanha.</p>}
                    {publicada && atualizacoes.erro && <p className="paragrafo texto-fraco">Não foi possível carregar as atualizações.</p>}
                    {publicada && !atualizacoes.erro && atualizacoes.dados.length === 0 && (
                      <p className="paragrafo texto-fraco">Ainda não há atualizações públicas para esta campanha.</p>
                    )}
                    {publicada && !atualizacoes.erro && atualizacoes.dados.length > 0 && (
                      <ul className="flex flex-col gap-5">
                        {atualizacoes.dados.map((atualizacao) => (
                          <li className="border-b borda-padrao pb-5 last:border-0 last:pb-0" key={atualizacao.idAtualizacao}>
                            <h3 className="subtitulo">{atualizacao.titulo}</h3>
                            <p className="legenda mt-1">{formatarData(atualizacao.publicadoEm)}</p>
                            <p className="paragrafo texto-padrao mt-3 whitespace-pre-wrap">{atualizacao.conteudo}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {publicada && atualizacoes.dados.length > 0 && (
                      <Link
                        className="inline-flex texto-marca font-bold hover:underline mt-6"
                        to={`/campanha/${campanha.idCampanha}/atualizacoes`}
                      >
                        Ver todas as atualizações
                      </Link>
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
                        <p className="legenda mt-2">{percentual}% da meta arrecadada</p>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="fundo-destaque rounded-xl p-3 border borda-padrao text-center">
                      <div className="numero text-xl font-bold texto-forte">{percentual === null ? '—' : `${percentual}%`}</div>
                      <div className="microrrotulo texto-fraco">Atingido</div>
                    </div>
                    <div className="fundo-aviso rounded-xl p-3 border borda-aviso text-center">
                      <div className="numero text-xl font-bold texto-aviso">{dias === null ? '—' : dias}</div>
                      <div className="microrrotulo texto-aviso">Dias restantes</div>
                    </div>
                    <div className="fundo-marca-sutil rounded-xl p-3 border borda-marca text-center">
                      <div className="numero text-xl font-bold texto-marca">—</div>
                      <div className="microrrotulo texto-marca">Apoios</div>
                    </div>
                  </div>
                  {aceitaApoios ? (
                    <Link
                      className="btn btn-primary w-full justify-center text-lg py-4 mb-6"
                      to={`/checkout?idCampanha=${campanha.idCampanha}`}
                    >
                      Apoiar esta pesquisa
                      <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </Link>
                  ) : (
                    <p className="paragrafo texto-fraco mb-6" role="status">
                      {emBreve(campanha)
                        ? 'A captação ainda não começou.'
                        : 'Esta campanha não está aceitando apoios no momento.'}
                    </p>
                  )}
                  <details className="rounded-xl border borda-padrao fundo-sutil p-4 text-sm texto-padrao">
                    <summary className="font-semibold texto-forte cursor-pointer select-none">
                      Como funciona o modelo {ROTULO_MODELO_CAMPANHA[campanha.modelo]}
                    </summary>
                    <p className="mt-4 leading-relaxed">{EXPLICACAO_MODELO_CAMPANHA}</p>
                  </details>
                </section>

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
                      <p className="text-xs texto-fraco mb-0.5">{campanha.nomeArea ?? 'Área de conhecimento não informada'}</p>
                    </div>
                  </Link>
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
        </>
      )}
    </main>
  );
}
