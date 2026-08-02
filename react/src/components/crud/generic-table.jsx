import { useEffect, useState } from 'react';

// Tabela genérica de CRUD, usada pelo painel admin (views/admin) — cada
// módulo novo do Nest com listagem simples vira só uma entrada de colunas
// aqui, não uma tela nova escrita do zero.
export function GenericTable({
  titulo,
  acaoTopo,
  colunas,
  chavePrimaria,
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
    if (!window.confirm(`Excluir "${linha[chavePrimaria]}"?`)) {
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
            {linhas.map((linha) => (
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
                      String(linha[coluna.chave] ?? '')
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
            {linhas.length === 0 && !erro && (
              <tr>
                <td colSpan={colunas.length + 1}>Nenhum registro.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {erro && <p className="crud-erro">{erro}</p>}
      {criar && camposCriar && (
        <form onSubmit={aoCriar} className="crud-form-criar">
          {camposCriar.map((campo) => (
            <input
              key={campo.chave}
              placeholder={campo.rotulo}
              value={novoRegistro[campo.chave] ?? ''}
              onChange={(evento) =>
                setNovoRegistro({ ...novoRegistro, [campo.chave]: evento.target.value })
              }
            />
          ))}
          <button type="submit">Criar</button>
        </form>
      )}
    </section>
  );
}
