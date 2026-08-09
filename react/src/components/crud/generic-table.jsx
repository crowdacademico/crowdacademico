import { useEffect, useMemo, useState } from 'react';
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

  // Filtro é só client-side (a lista inteira já veio do backend) — resolve
  // "achar uma linha no meio de 28" (Configurações já tem esse tanto), mas
  // não resolve buscar num universo de milhares sem baixar tudo primeiro —
  // isso exigiria busca no próprio backend (LIMIT/OFFSET + WHERE), fora do
  // escopo desta rodada.
  const linhasFiltradas = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) {
      return linhas;
    }
    return linhas.filter((linha) =>
      colunas.some((coluna) => String(linha[coluna.chave] ?? '').toLowerCase().includes(termo)),
    );
  }, [linhas, filtro, colunas]);

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

      {!carregando && linhas.length > LIMIAR_FILTRO && (
        <input
          type="search"
          placeholder="Filtrar..."
          value={filtro}
          onChange={(evento) => {
            setFiltro(evento.target.value);
            setPagina(1);
          }}
          className="w-full sm:w-64 border borda-forte rounded-lg fundo-sutil py-2 px-3 text-sm outline-none focus:border-primary mb-3"
        />
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
                    {filtro ? 'Nenhum registro bate com o filtro.' : 'Nenhum registro.'}
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
