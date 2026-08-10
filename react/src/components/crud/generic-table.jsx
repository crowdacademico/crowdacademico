import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useErroToast } from '../layout/use-erro-toast';
import { LogAuditoriaPainel } from './log-auditoria-painel';

const TAMANHOS_PAGINA = [10, 20, 30, 'todos'];
const LIMIAR_FILTRO = 5;

// Valor booleano vira badge colorido (Sim/Não), não o texto cru "true"/
// "false" — muito mais legível numa lista (achado do Claude Web, rodando
// o painel de verdade: "E-MAIL VERIFICADO: false" não é instantâneo de
// ler, um badge é).
function celulaValor(valor) {
  if (typeof valor === 'boolean') {
    return (
      <span className={'badge ' + (valor ? 'badge-sucesso' : 'badge-neutro')}>
        {valor ? 'Sim' : 'Não'}
      </span>
    );
  }
  return String(valor ?? '');
}

// Tabela genérica de LISTAGEM (leitura, filtro, ordenação, paginação) usada
// pelo painel admin — cada módulo novo do Nest com listagem simples vira só
// uma entrada de colunas aqui, não uma tela nova escrita do zero.
//
// Criar/Alterar/Excluir NÃO acontecem mais aqui dentro (pedido do Lucas,
// 02-08-2026: "tudo que faz parte do CRUD precisa de view própria" — mesmo
// padrão já usado em views/1-usuario/criar-usuario.jsx). Passando
// `rotaBase` (ex.: "/usuarios"), cada linha ganha "Alterar"/"Excluir"
// apontando pra `${rotaBase}/${id}/alterar` e `/excluir` — páginas de
// verdade, com sua própria URL, não formulário/confirm() embutido na
// tabela. Sem `rotaBase` (catálogos só-leitura como Papéis/Permissões),
// não aparece coluna de Ações nenhuma.
//
// `buscarLog` (opcional, pedido do Lucas 03-08-2026: "um botão no fundo de
// cada tabela pra ver a última alteração") — mesma convenção de `listar`:
// função já pré-amarrada (authFetch + nome físico da tabela) pelo
// componente pai (ver listar-usuarios.jsx/listar-configuracoes.jsx). Sem
// essa prop, o botão "Ver log" nem aparece — nem toda tabela tem
// log_auditoria aplicado (só as que passam por `fn_log_auditoria()`, ver
// 05_regras_negocio.sql [05-L]).
const ACOES_PADRAO = ['alterar', 'consultar', 'excluir'];

export function GenericTable({
  titulo,
  acaoTopo,
  colunas,
  chavePrimaria,
  listar,
  rotaBase,
  buscarLog,
  // Repassado direto pro LogAuditoriaPainel (09-08-2026, ver comentário lá)
  // — troca a coluna genérica "Campos alterados" por "De"/"Para" lendo
  // esse campo específico de dadosAnteriores/dadosNovos.
  campoRenomeioLog,
  // Quais dos 3 botões padrão aparecem, quando `rotaBase` está presente
  // (03-08-2026, pedido do Lucas: Papéis precisa só de "Alterar" — sem
  // Consultar (a tabela já mostra tudo, mesma decisão já tomada pra
  // Usuário/Configuração) e sem Excluir (apagar um papel usado em RBAC é
  // decisão maior, fora de escopo). Default preserva o comportamento de
  // sempre (todo `rotaBase` já existente continua com os 3 botões).
  acoes = ACOES_PADRAO,
  // Coluna adicional genérica (09-08-2026, Bloco F: botão "ⓘ" que abre um
  // modal de detalhe por linha, na tabela Permissões) — `{ rotulo,
  // renderizar(linha) }`. Existe separada de `colunas` (que só espera
  // valor de dado bruto) porque esta pode renderizar QUALQUER coisa
  // (botão, ícone, badge composto), não só `String(valor)`. Independe de
  // `rotaBase`/`acoes` — tabelas só-leitura (sem Ações) também podem usar.
  colunaExtra,
  // Filtros por faceta (09-08-2026, pedido do Lucas: filtro de papel na
  // tabela Usuários; generalizado no mesmo dia pra virar lista — tabela
  // Permissões pediu 2 lado a lado, papel e impacto) — array de `{ chave,
  // rotulo, ordem? }`. Genérico: funciona pra QUALQUER coluna com valores
  // discretos, não só "papel"/"impacto" — as opções de cada dropdown são
  // derivadas sozinhas a partir dos valores que já aparecem em
  // `linha[chave]` (célula com vários valores separada por ", ", mesma
  // convenção já usada pela coluna "papel" de ListarUsuarios; célula de
  // valor único também funciona, vira uma lista de 1 token). Cada faceta é
  // independente (marcar em uma não mexe nas outras) e se combinam com E
  // entre si (dentro da mesma faceta é OU) — padrão de cada uma é "Todos"
  // (nenhuma opção marcada = sem filtro nenhum, mostra tudo). `ordem`
  // (opcional, por faceta) — lista com a ordem exata desejada (ex.: papel
  // do menor pro maior poder); sem isso, cai no alfabético (pt-BR). Valor
  // que aparecer nos dados mas não estiver em `ordem` vai pro final da
  // lista, não desaparece.
  filtrosFacetados,
}) {
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro, limparErro } = useErroToast();
  const [filtro, setFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ordenacao, setOrdenacao] = useState({ chave: null, direcao: 'asc' });
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHOS_PAGINA[0]);
  // Só busca quando abre (não em toda carga da tabela) — a maioria das
  // visitas a uma listagem não vai clicar em "Ver log".
  const [logAberto, setLogAberto] = useState(false);
  // Só 1 dropdown de faceta aberto por vez (chave de qual está aberta, ou
  // null) — mais simples que um booleano por faceta, e evita 2 dropdowns
  // abertos sobrepondo um no outro quando são vários lado a lado.
  const [facetaAbertaChave, setFacetaAbertaChave] = useState(null);
  // Seleção de cada faceta, independente: { [chave]: string[] }. Faceta
  // sem entrada aqui (ou array vazio) = "Todos" pra ela.
  const [selecoesPorFaceta, setSelecoesPorFaceta] = useState({});
  const facetasRef = useRef(null);

  // Fechar ao clicar fora (09-08-2026) — ERA onBlur+relatedTarget (mesmo
  // padrão do DevLoginRapido), mas com checkbox dentro de <label> isso
  // fecha o dropdown ANTES do clique completar: o mousedown num elemento
  // não-focável (o texto do <label>) dispara blur no botão que abriu o
  // dropdown com relatedTarget ainda nulo (o navegador só decide o próximo
  // foco depois), o guard via de que "saiu do container" e fecha — achado
  // ao vivo pelo Lucas ("clico em qualquer coisa que não seja o
  // quadradinho, o filtro fecha e não faz nada"). Listener de mousedown no
  // document, comparando o alvo do clique com o container (o ref cobre
  // TODAS as facetas juntas, não uma por vez) por `contains()`, não
  // depende de foco nenhum — fecha só quando o clique é GEOMETRICAMENTE
  // fora de qualquer uma delas. Clicar no botão de OUTRA faceta ainda está
  // dentro do container, então só troca qual está aberta, não fecha tudo.
  useEffect(() => {
    if (facetaAbertaChave === null) {
      return undefined;
    }
    const aoClicarFora = (evento) => {
      if (facetasRef.current && !facetasRef.current.contains(evento.target)) {
        setFacetaAbertaChave(null);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [facetaAbertaChave]);

  useEffect(() => {
    // Padrão comum de "buscar dado ao montar/quando a query mudar" (mesmo
    // exemplo dos docs do React) — a regra nova react-hooks/set-state-in-effect
    // marca a chamada de setCarregando/setErro como suspeita mesmo assim.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    limparErro();
    listar()
      .then(setLinhas)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listar]);

  // Opções de CADA dropdown de faceta — derivadas dos dados que já
  // chegaram (não da lista FILTRADA, senão as opções desapareceriam/
  // reapareceriam conforme a pessoa digita no campo de busca ou marca
  // outra faceta, confuso). Sempre a partir de `linhas` inteira. Com
  // `ordem` na faceta, respeita essa ordem (ex.: papel do menor pro maior
  // poder, impacto de baixo pro alto); sem isso, alfabético (pt-BR).
  // `{ [chave]: string[] }`, uma entrada por faceta.
  const opcoesPorFaceta = useMemo(() => {
    const resultado = {};
    (filtrosFacetados ?? []).forEach((faceta) => {
      const valores = new Set();
      linhas.forEach((linha) => {
        String(linha[faceta.chave] ?? '')
          .split(',')
          .map((valor) => valor.trim())
          .filter(Boolean)
          .forEach((valor) => valores.add(valor));
      });
      const lista = [...valores];
      if (faceta.ordem) {
        const posicao = (valor) => {
          const indice = faceta.ordem.indexOf(valor);
          return indice === -1 ? faceta.ordem.length : indice;
        };
        lista.sort((a, b) => posicao(a) - posicao(b) || a.localeCompare(b, 'pt-BR'));
      } else {
        lista.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      }
      resultado[faceta.chave] = lista;
    });
    return resultado;
  }, [linhas, filtrosFacetados]);

  // Faceta com pelo menos 1 seleção marcada (as com array vazio/ausente
  // contam como "Todos", não filtram nada) — usado tanto no filtro quanto
  // pra saber se deve mostrar "Nenhum registro bate com o filtro."
  const algumaFacetaAtiva = (filtrosFacetados ?? []).some(
    (faceta) => (selecoesPorFaceta[faceta.chave]?.length ?? 0) > 0,
  );

  // Filtro é só client-side (a lista inteira já veio do backend) — resolve
  // "achar uma linha no meio de 28" (Configurações já tem esse tanto), mas
  // não resolve buscar num universo de milhares sem baixar tudo primeiro —
  // isso exigiria busca no próprio backend (LIMIT/OFFSET + WHERE), fora do
  // escopo desta rodada.
  const linhasFiltradas = useMemo(() => {
    let base = linhas;

    // Facetas primeiro (nenhuma marcada em cada uma = "Todos", sem filtro
    // nenhum — o padrão pedido pelo Lucas), texto depois. Entre facetas
    // DIFERENTES é E (uma linha só sobrevive se bater em TODAS as que têm
    // seleção); dentro da MESMA faceta é OU (basta bater em uma das
    // opções marcadas).
    (filtrosFacetados ?? []).forEach((faceta) => {
      const selecionados = selecoesPorFaceta[faceta.chave];
      if (selecionados && selecionados.length > 0) {
        base = base.filter((linha) => {
          const valoresDaLinha = String(linha[faceta.chave] ?? '')
            .split(',')
            .map((valor) => valor.trim());
          return valoresDaLinha.some((valor) => selecionados.includes(valor));
        });
      }
    });

    const termo = filtro.trim().toLowerCase();
    if (!termo) {
      return base;
    }
    return base.filter((linha) =>
      colunas.some((coluna) => String(linha[coluna.chave] ?? '').toLowerCase().includes(termo)),
    );
  }, [linhas, filtro, colunas, filtrosFacetados, selecoesPorFaceta]);

  // Ordena a lista FILTRADA inteira, antes de paginar — nunca a página
  // atual sozinha. Ordenar só a fatia visível é o jeito clássico desse tipo
  // de recurso "bugar com paginação" (linha some da vista ao virar página,
  // ordem parece errada entre páginas). Tipo da coluna vem do próprio dado
  // (typeof do primeiro valor não-nulo achado), não de uma config nova por
  // coluna — funciona pra number (id), string (nome/email) e boolean
  // (email verificado) sem precisar declarar isso em cada tela que usa
  // GenericTable.
  const linhasOrdenadas = useMemo(() => {
    if (!ordenacao.chave) {
      return linhasFiltradas;
    }
    const linhaComValor = linhas.find(
      (linha) => linha[ordenacao.chave] !== null && linha[ordenacao.chave] !== undefined,
    );
    const tipo = typeof linhaComValor?.[ordenacao.chave];
    const sinal = ordenacao.direcao === 'asc' ? 1 : -1;

    return [...linhasFiltradas].sort((a, b) => {
      const valorA = a[ordenacao.chave];
      const valorB = b[ordenacao.chave];
      if (tipo === 'number') {
        return (valorA - valorB) * sinal;
      }
      if (tipo === 'boolean') {
        return (valorA === valorB ? 0 : valorA ? 1 : -1) * sinal;
      }
      return String(valorA ?? '').localeCompare(String(valorB ?? ''), 'pt-BR') * sinal;
    });
  }, [linhasFiltradas, linhas, ordenacao]);

  // "todos" (pedido do Lucas: opção de ver 10/20/30/todos os registros,
  // além de Anterior/Próxima) vira 1 página só, com a lista inteira.
  const totalPaginas =
    tamanhoPagina === 'todos'
      ? 1
      : Math.max(1, Math.ceil(linhasOrdenadas.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasPagina =
    tamanhoPagina === 'todos'
      ? linhasOrdenadas
      : linhasOrdenadas.slice(
          (paginaAtual - 1) * tamanhoPagina,
          paginaAtual * tamanhoPagina,
        );

  const aoClicarColuna = (chave) => {
    setOrdenacao((atual) =>
      atual.chave === chave
        ? { chave, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' }
        : { chave, direcao: 'asc' },
    );
    // Senão a pessoa pode ficar "presa" na página 3 depois de reordenar,
    // vendo um pedaço que não corresponde mais ao topo da lista nova.
    setPagina(1);
  };

  return (
    <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h2>{titulo}</h2>
        {acaoTopo && <div className="crud-secao__acao-topo">{acaoTopo}</div>}
      </div>

      {!carregando &&
        (linhas.length > LIMIAR_FILTRO ||
          (filtrosFacetados ?? []).some((faceta) => (opcoesPorFaceta[faceta.chave]?.length ?? 0) > 1)) && (
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {linhas.length > LIMIAR_FILTRO && (
              <input
                type="search"
                placeholder="Filtrar..."
                value={filtro}
                onChange={(evento) => {
                  setFiltro(evento.target.value);
                  setPagina(1);
                }}
                className="w-full sm:w-64 border borda-forte rounded-lg fundo-sutil py-2 px-3 text-sm outline-none focus:border-primary"
              />
            )}

            {/* Filtros por faceta (09-08-2026), lado a lado — 1+ dropdowns,
                cada um só aparece se houver mais de 1 valor possível (com 1
                só, filtrar não faria diferença nenhuma). O ref cobre TODAS
                juntas (ver useEffect de clicar fora, acima) — clicar no
                botão de uma enquanto outra está aberta só troca qual está
                aberta, não fecha as duas. */}
            {(filtrosFacetados ?? []).length > 0 && (
              <div className="flex items-center gap-3 flex-wrap" ref={facetasRef}>
                {filtrosFacetados.map((faceta) => {
                  const opcoes = opcoesPorFaceta[faceta.chave] ?? [];
                  if (opcoes.length <= 1) {
                    return null;
                  }
                  const selecionados = selecoesPorFaceta[faceta.chave] ?? [];
                  const aberta = facetaAbertaChave === faceta.chave;

                  return (
                    <div key={faceta.chave} className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setFacetaAbertaChave((atual) => (atual === faceta.chave ? null : faceta.chave))
                        }
                        className="btn btn-secondary text-sm flex items-center gap-2"
                      >
                        <i className="fa-solid fa-filter"></i>
                        {faceta.rotulo}
                        {selecionados.length > 0 ? (
                          <span className="badge badge-sucesso">{selecionados.length}</span>
                        ) : (
                          <span className="texto-fraco font-normal">(Todos)</span>
                        )}
                        <i className="fa-solid fa-chevron-down text-xs"></i>
                      </button>

                      {aberta && (
                        <div className="absolute left-0 mt-1 w-56 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setSelecoesPorFaceta((atuais) => ({ ...atuais, [faceta.chave]: [] }));
                              setPagina(1);
                            }}
                            className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-primary/10 border-b borda-padrao flex items-center justify-between"
                          >
                            Todos
                            {selecionados.length === 0 && <i className="fa-solid fa-check texto-sucesso"></i>}
                          </button>
                          <div className="max-h-64 overflow-y-auto">
                            {opcoes.map((opcao) => {
                              const marcado = selecionados.includes(opcao);
                              const alternar = () => {
                                setSelecoesPorFaceta((atuais) => {
                                  const atual = atuais[faceta.chave] ?? [];
                                  return {
                                    ...atuais,
                                    [faceta.chave]: marcado
                                      ? atual.filter((valor) => valor !== opcao)
                                      : [...atual, opcao],
                                  };
                                });
                                setPagina(1);
                              };
                              return (
                                // Clique na linha toda alterna, não só na
                                // caixinha (09-08-2026, achado do Lucas:
                                // "clico em qualquer coisa que não seja o
                                // quadradinho e não faz nada"). 2 casos,
                                // tratados diferente de propósito: clique
                                // DIRETO na caixinha deixa o navegador fazer
                                // o que já sabe fazer sozinho (onChange do
                                // <input>, ver abaixo) — é o jeito mais
                                // confiável de manter o visual sincronizado,
                                // sem gambiarra. Clique no TEXTO (o alvo não
                                // é o <input>) chama `alternar()` aqui e
                                // cancela o encaminhamento nativo pro
                                // <input> por baixo (preventDefault) — sem
                                // isso, o clique alternaria a caixinha 2x
                                // (uma vez aqui, outra pelo encaminhamento)
                                // e cancelaria a mudança.
                                <label
                                  key={opcao}
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer"
                                  onClick={(evento) => {
                                    if (evento.target.tagName !== 'INPUT') {
                                      evento.preventDefault();
                                      alternar();
                                    }
                                  }}
                                >
                                  <input type="checkbox" checked={marcado} onChange={alternar} />
                                  {opcao}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {carregando ? (
        // Esqueleto em vez de texto "Carregando..." — padrão comum em
        // painel admin (Linear, Stripe, Vercel): já mostra o formato da
        // tabela (mesmas colunas) enquanto os dados reais não chegam, em
        // vez de um texto solto que faz a tela "pular" quando os dados
        // aparecem.
        <table className="crud-tabela">
          <thead>
            <tr>
              {colunas.map((coluna) => (
                <th key={coluna.chave}>{coluna.rotulo}</th>
              ))}
              {colunaExtra && <th>{colunaExtra.rotulo}</th>}
              {rotaBase && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((indice) => (
              <tr key={indice} className="animate-pulse">
                {colunas.map((coluna) => (
                  <td key={coluna.chave}>
                    <div className="h-3.5 fundo-sutil rounded"></div>
                  </td>
                ))}
                {colunaExtra && (
                  <td>
                    <div className="h-3.5 fundo-sutil rounded"></div>
                  </td>
                )}
                {rotaBase && (
                  <td>
                    <div className="h-3.5 fundo-sutil rounded"></div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <table className="crud-tabela">
            <thead>
              <tr>
                {colunas.map((coluna) => (
                  <th
                    key={coluna.chave}
                    className="crud-tabela__ordenavel"
                    onClick={() => aoClicarColuna(coluna.chave)}
                  >
                    {coluna.rotulo}
                    {ordenacao.chave === coluna.chave && (ordenacao.direcao === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
                {colunaExtra && <th>{colunaExtra.rotulo}</th>}
                {rotaBase && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {linhasPagina.map((linha) => (
                <tr key={linha[chavePrimaria]}>
                  {colunas.map((coluna) => (
                    <td key={coluna.chave}>
                      {/* `renderizar` (09-08-2026, tabela Permissões: botão
                          "Saiba mais" no lugar do valor cru) — opcional, só
                          uma coluna especial precisa disso, as outras
                          continuam mostrando o dado normal. */}
                      {coluna.renderizar
                        ? coluna.renderizar(linha)
                        : celulaValor(linha[coluna.chave])}
                    </td>
                  ))}
                  {colunaExtra && <td>{colunaExtra.renderizar(linha)}</td>}
                  {rotaBase && (
                    <td>
                      {/* Texto/ícone discreto, não botão sólido (08-08-2026).
                          Ícone com uma cor fraquinha (09-08-2026, pedido do
                          Lucas: "voltar a dar as cores das ações... mas mais
                          fraquinho, só pra dar mais vida") — ver
                          .crud-tabela__acao--alterar/--excluir em
                          4-crud.css. Texto continua neutro nos dois casos. */}
                      <div className="crud-tabela__acoes">
                        {acoes.includes('alterar') && (
                          <Link
                            className="crud-tabela__acao crud-tabela__acao--alterar"
                            to={`${rotaBase}/${linha[chavePrimaria]}/alterar`}
                          >
                            <i className="fa-solid fa-pen"></i> Alterar
                          </Link>
                        )}
                        {acoes.includes('consultar') && (
                          <Link
                            className="crud-tabela__acao"
                            to={`${rotaBase}/${linha[chavePrimaria]}/consultar`}
                          >
                            <i className="fa-solid fa-eye"></i> Consultar
                          </Link>
                        )}
                        {acoes.includes('excluir') && (
                          <Link
                            className="crud-tabela__acao crud-tabela__acao--excluir"
                            to={`${rotaBase}/${linha[chavePrimaria]}/excluir`}
                          >
                            <i className="fa-solid fa-trash"></i> Excluir
                          </Link>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {linhasPagina.length === 0 && !erro && (
                <tr>
                  <td colSpan={colunas.length + (colunaExtra ? 1 : 0) + (rotaBase ? 1 : 0)}>
                    {filtro || algumaFacetaAtiva
                      ? 'Nenhum registro bate com o filtro.'
                      : 'Nenhum registro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {linhasOrdenadas.length > TAMANHOS_PAGINA[0] && (
            <div className="flex items-center justify-between flex-wrap gap-3 mt-3 text-sm texto-padrao">
              <span>
                Página {paginaAtual} de {totalPaginas} ({linhasOrdenadas.length} registros)
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold texto-padrao">
                  Mostrar
                  <select
                    value={tamanhoPagina}
                    onChange={(evento) => {
                      const valor = evento.target.value;
                      setTamanhoPagina(valor === 'todos' ? 'todos' : Number(valor));
                      setPagina(1);
                    }}
                    className="border borda-padrao rounded-md fundo-sutil py-1 px-2 text-xs outline-none focus:border-primary"
                  >
                    {TAMANHOS_PAGINA.map((tamanho) => (
                      <option key={tamanho} value={tamanho}>
                        {tamanho === 'todos' ? 'Todos' : tamanho}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                    className="btn btn-secondary"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                    className="btn btn-secondary"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {erro && <p className="crud-erro">{erro}</p>}

      {buscarLog && (
        <>
          <button
            type="button"
            onClick={() => setLogAberto((atual) => !atual)}
            className="btn btn-secondary mt-4"
          >
            {logAberto ? 'Esconder log' : 'Ver log'}
          </button>
          {logAberto && (
            <LogAuditoriaPainel buscar={buscarLog} campoRenomeio={campoRenomeioLog} />
          )}
        </>
      )}
    </section>
  );
}
