import { useEffect, useState } from 'react';

// Tabela genérica de CRUD — "o mínimo que prova que backend+RLS funcionam",
// não uma tela bonita (ver views/dev/dev-dashboard.jsx e o relatório desta
// rodada: isto é ferramenta interna descartável de propósito, não o admin
// de verdade que vem bem mais na frente). Configurada por colunas — cada
// novo módulo do Nest vira só uma entrada nova aqui, não uma tela nova.
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
    <section className="devtools-secao">
      <div className="devtools-secao__cabecalho">
        <h2>{titulo}</h2>
        {acaoTopo}
      </div>
      {erro && <p className="devtools-erro">{erro}</p>}
      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <table className="devtools-tabela">
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
            {linhas.length === 0 && (
              <tr>
                <td colSpan={colunas.length + 1}>Nenhum registro.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {criar && camposCriar && (
        <form onSubmit={aoCriar} className="devtools-form-criar">
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
