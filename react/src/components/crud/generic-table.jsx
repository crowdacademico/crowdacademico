import { useEffect, useMemo, useState } from 'react';

const TAMANHO_PAGINA = 10;

// Valor booleano vira badge colorido (Sim/Não), não o texto cru "true"/
// "false" — muito mais legível numa lista (achado do Claude Web, rodando
// o painel de verdade: "E-MAIL VERIFICADO: false" não é instantâneo de
// ler, um badge é).
function celulaValor(valor) {
  if (typeof valor === 'boolean') {
    return (
      <span
        className={
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ' +
          (valor ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')
        }
      >
        {valor ? 'Sim' : 'Não'}
      </span>
    );
  }
  return String(valor ?? '');
}

// Tabela genérica de CRUD, usada pelo painel admin (views/admin) — cada
// módulo novo do Nest com listagem simples vira só uma entrada de colunas
// aqui, não uma tela nova escrita do zero.
//
// campoRotulo (opcional): qual coluna mostrar na confirmação de exclusão
// (ex.: "nome") — sem isso, cai pra chavePrimaria (ex.: excluir "8" em vez
// de excluir "Admin Sistema", bem menos claro).
//
// camposCriar[i].tipo: 'texto' (padrão) ou 'select' + `opcoes: [{valor,
// rotulo}]` — campo de conjunto fechado (ex.: tipo de configuração) vira
// <select>, não texto livre.
export function GenericTable({
  titulo,
  acaoTopo,
  colunas,
  chavePrimaria,
  campoRotulo,
  listar,
  criar,
  camposCriar,
  atualizar,
  remover,
}) {
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [novoRegistro, setNovoRegistro] = useState({});
  const [editandoChave, setEditandoChave] = useState(null);
  const [edicao, setEdicao] = useState({});
  const [filtro, setFiltro] = useState('');
  const [pagina, setPagina] = useState(1);

  const recarregar = () => {
    setCarregando(true);
    setErro('');
    listar()
      .then(setLinhas)
      .catch((erroRequisicao) => setErro(erroRequisicao.message))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    // Padrão comum de "buscar dado ao montar/quando a query mudar" (mesmo
    // exemplo dos docs do React) — a regra nova react-hooks/set-state-in-effect
    // marca a chamada de setCarregando/setErro como suspeita mesmo assim.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar();
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

  const totalPaginas = Math.max(1, Math.ceil(linhasFiltradas.length / TAMANHO_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasPagina = linhasFiltradas.slice(
    (paginaAtual - 1) * TAMANHO_PAGINA,
    paginaAtual * TAMANHO_PAGINA,
  );

  const aoCriar = async (evento) => {
    evento.preventDefault();
    setErro('');
    try {
      await criar(novoRegistro);
      setNovoRegistro({});
      recarregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    }
  };

  const iniciarEdicao = (linha) => {
    setEditandoChave(linha[chavePrimaria]);
    setEdicao({ ...linha });
  };

  const salvarEdicao = async () => {
    setErro('');
    try {
      await atualizar(editandoChave, edicao);
      setEditandoChave(null);
      recarregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    }
  };

  const excluir = async (linha) => {
    const rotulo = campoRotulo ? linha[campoRotulo] : linha[chavePrimaria];
    if (!window.confirm(`Excluir "${rotulo}"?`)) {
      return;
    }
    setErro('');
    try {
      await remover(linha[chavePrimaria]);
      recarregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    }
  };

  return (
    <section className="crud-secao">
      <h2>{titulo}</h2>
      {acaoTopo && <div className="crud-secao__acao-topo">{acaoTopo}</div>}

      {!carregando && linhas.length > TAMANHO_PAGINA / 2 && (
        <input
          type="search"
          placeholder="Filtrar..."
          value={filtro}
          onChange={(evento) => {
            setFiltro(evento.target.value);
            setPagina(1);
          }}
          className="w-full sm:w-64 border border-slate-200 rounded-lg bg-slate-50 py-2 px-3 text-sm outline-none focus:border-primary mb-3"
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
              {(atualizar || remover) && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((indice) => (
              <tr key={indice} className="animate-pulse">
                {colunas.map((coluna) => (
                  <td key={coluna.chave}>
                    <div className="h-3.5 bg-slate-200 rounded"></div>
                  </td>
                ))}
                {(atualizar || remover) && (
                  <td>
                    <div className="h-3.5 bg-slate-200 rounded"></div>
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
                  <th key={coluna.chave}>{coluna.rotulo}</th>
                ))}
                {(atualizar || remover) && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {linhasPagina.map((linha) => (
                <tr key={linha[chavePrimaria]}>
                  {colunas.map((coluna) => (
                    <td key={coluna.chave}>
                      {editandoChave === linha[chavePrimaria] && coluna.editavel ? (
                        <input
                          value={edicao[coluna.chave] ?? ''}
                          onChange={(evento) =>
                            setEdicao({ ...edicao, [coluna.chave]: evento.target.value })
                          }
                        />
                      ) : (
                        celulaValor(linha[coluna.chave])
                      )}
                    </td>
                  ))}
                  {(atualizar || remover) && (
                    <td>
                      {editandoChave === linha[chavePrimaria] ? (
                        <>
                          <button onClick={salvarEdicao}>Salvar</button>
                          <button onClick={() => setEditandoChave(null)}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          {atualizar && (
                            <button onClick={() => iniciarEdicao(linha)}>Editar</button>
                          )}
                          {remover && <button onClick={() => excluir(linha)}>Excluir</button>}
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {linhasPagina.length === 0 && !erro && (
                <tr>
                  <td colSpan={colunas.length + 1}>
                    {filtro ? 'Nenhum registro bate com o filtro.' : 'Nenhum registro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
              <span>
                Página {paginaAtual} de {totalPaginas} ({linhasFiltradas.length} registros)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="px-3 py-1 rounded-md border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="px-3 py-1 rounded-md border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {erro && <p className="crud-erro">{erro}</p>}

      {criar && camposCriar && (
        <form onSubmit={aoCriar} className="crud-form-criar">
          {camposCriar.map((campo) => (
            <label key={campo.chave} className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              {campo.rotulo}
              {campo.tipo === 'select' ? (
                <select
                  value={novoRegistro[campo.chave] ?? ''}
                  onChange={(evento) =>
                    setNovoRegistro({ ...novoRegistro, [campo.chave]: evento.target.value })
                  }
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {campo.opcoes.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={novoRegistro[campo.chave] ?? ''}
                  onChange={(evento) =>
                    setNovoRegistro({ ...novoRegistro, [campo.chave]: evento.target.value })
                  }
                />
              )}
            </label>
          ))}
          <button type="submit">Criar</button>
        </form>
      )}
    </section>
  );
}
