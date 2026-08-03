import { useCallback, useEffect, useState } from 'react';
import { Tooltip } from '../../components/layout/tooltip';
import { useToast } from '../../components/layout/use-toast';
import {
  papelApi,
  papelPermissaoApi,
  permissaoApi,
} from '../../services/2-papel-permissao/api/papel-permissao.api';

// Substituiu a antiga tabela "Papel × Permissão" (linhas repetindo
// "admin | admin | ..." — achado do Claude Web: ~40 linhas pra mostrar o
// que uma matriz mostra em muito menos espaço). Não usa GenericTable — é
// um formato fundamentalmente diferente (matriz, não lista de linha+ações).
//
// Clicável desde 03-08-2026 (pedido do Lucas: "o administrador precisa ter
// poder absoluto pelo painel admin, nunca mais precisará acessar o banco
// depois") — cada célula agora concede/revoga a permissão daquele papel,
// via `papelPermissaoApi.atribuir/remover` (RLS exige a permissão
// 'papel_gerenciar', ver [04-B-1] em 04_rls_policies.sql).
//
// Linhas/colunas vêm do CATÁLOGO COMPLETO (`papelApi`/`permissaoApi`), não
// só das combinações já concedidas (`papelPermissaoApi.listar`) — senão um
// papel ou permissão sem nenhum vínculo hoje (ex.: 'usuario',
// 'pesquisador') nunca apareceria pra admin conceder a primeira permissão
// a ele pelo painel, o que contradiz o próprio objetivo de "nunca precisar
// mexer no banco". `papel`/`permissao` em si continuam só-leitura — criar
// um papel ou permissão novos (não só conceder uma combinação já
// existente) é decisão maior, fora de escopo aqui.
const TEXTO_TOOLTIP_MATRIZ =
  'Todo papel e toda permissão cadastrados aparecem aqui, mesmo sem ' +
  "nenhum vínculo ainda (ex.: 'usuario'/'pesquisador' começam sem nenhuma " +
  'permissão nomeada — o acesso deles normalmente é por serem donos do ' +
  'próprio dado, não por permissão, mas nada impede conceder uma se ' +
  'precisar). Clique numa célula pra conceder ou revogar.';

// Colunas em ordem de poder (maior pro menor), não alfabética — pedido do
// Lucas, 03-08-2026. Papel que não estiver nesta lista (ex.: um papel novo
// criado direto no banco, já que `papel` continua só-leitura pela API) cai
// no fim, em ordem alfabética entre si — nunca some da matriz.
const ORDEM_PAPEIS_POR_PODER = [
  'admin',
  'moderador',
  'revisor',
  'suporte',
  'curador',
  'pesquisador',
  'usuario',
];

function ordenarPapeisPorPoder(a, b) {
  const indiceA = ORDEM_PAPEIS_POR_PODER.indexOf(a.nome);
  const indiceB = ORDEM_PAPEIS_POR_PODER.indexOf(b.nome);
  if (indiceA === -1 && indiceB === -1) {
    return a.nome.localeCompare(b.nome);
  }
  if (indiceA === -1) {
    return 1;
  }
  if (indiceB === -1) {
    return -1;
  }
  return indiceA - indiceB;
}

export function MatrizPapelPermissao({ authFetch }) {
  const { mostrar } = useToast();
  const [papeis, setPapeis] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [concedidos, setConcedidos] = useState(new Set());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [celulaAlterando, setCelulaAlterando] = useState(null);

  const recarregar = useCallback(() => {
    setCarregando(true);
    setErro('');
    Promise.all([
      papelApi.listar(authFetch),
      permissaoApi.listar(authFetch),
      papelPermissaoApi.listar(authFetch),
    ])
      .then(([listaPapeis, listaPermissoes, vinculos]) => {
        setPapeis([...listaPapeis].sort(ordenarPapeisPorPoder));
        setPermissoes([...listaPermissoes].sort((a, b) => a.nome.localeCompare(b.nome)));
        setConcedidos(new Set(vinculos.map((v) => `${v.idPapel}-${v.idPermissao}`)));
      })
      .catch((erroRequisicao) => setErro(erroRequisicao.message))
      .finally(() => setCarregando(false));
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar();
  }, [recarregar]);

  const alternar = async (idPapel, nomePapel, idPermissao, nomePermissao, concedidoAtual) => {
    const chave = `${idPapel}-${idPermissao}`;
    setErro('');
    setCelulaAlterando(chave);
    try {
      if (concedidoAtual) {
        await papelPermissaoApi.remover(authFetch, idPapel, idPermissao);
        mostrar(
          'Permissão revogada com sucesso.',
          `O papel "${nomePapel}" perdeu a permissão "${nomePermissao}"`,
        );
      } else {
        await papelPermissaoApi.atribuir(authFetch, idPapel, idPermissao);
        mostrar(
          'Permissão concedida com sucesso.',
          `O papel "${nomePapel}" agora tem a permissão "${nomePermissao}"`,
        );
      }
      recarregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCelulaAlterando(null);
    }
  };

  return (
    <section className="crud-secao">
      <h2 className="flex items-center">
        Papel × Permissão
        <Tooltip texto={TEXTO_TOOLTIP_MATRIZ} />
      </h2>

      {carregando ? (
        <div className="animate-pulse h-32 bg-slate-100 rounded"></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="crud-tabela">
            <thead>
              <tr>
                <th>Permissão</th>
                {papeis.map((papel) => (
                  <th key={papel.idPapel} className="text-center">
                    {papel.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissoes.map((permissao) => (
                <tr key={permissao.idPermissao}>
                  <td>{permissao.nome}</td>
                  {papeis.map((papel) => {
                    const chave = `${papel.idPapel}-${permissao.idPermissao}`;
                    const temPermissao = concedidos.has(chave);
                    return (
                      <td key={papel.idPapel} className="text-center">
                        <button
                          type="button"
                          onClick={() =>
                            alternar(
                              papel.idPapel,
                              papel.nome,
                              permissao.idPermissao,
                              permissao.nome,
                              temPermissao,
                            )
                          }
                          disabled={celulaAlterando === chave}
                          title={
                            temPermissao
                              ? `Clique pra revogar de "${papel.nome}"`
                              : `Clique pra conceder pra "${papel.nome}"`
                          }
                          className={
                            'w-7 h-7 rounded-md font-bold transition-colors disabled:opacity-50 disabled:cursor-wait ' +
                            (temPermissao
                              ? 'text-emerald-600 hover:bg-emerald-100'
                              : 'text-slate-300 hover:bg-slate-100 hover:text-slate-400')
                          }
                        >
                          {celulaAlterando === chave ? '…' : temPermissao ? '✓' : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {permissoes.length === 0 && (
                <tr>
                  <td colSpan={papeis.length + 1}>Nenhuma permissão cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {erro && <p className="crud-erro">{erro}</p>}
    </section>
  );
}
