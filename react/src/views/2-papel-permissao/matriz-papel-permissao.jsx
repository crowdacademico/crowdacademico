import { useCallback, useEffect, useState } from 'react';
import { Tooltip } from '../../components/layout/tooltip';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import {
  papelApi,
  papelPermissaoApi,
  permissaoApi,
} from '../../services/2-papel-permissao/api/papel-permissao.api';
import { nomeAmigavelPermissao } from '../../services/2-papel-permissao/constants/permissao-nomes-amigaveis';

// Substituiu a antiga tabela "Papel × Permissão" (linhas repetindo
// "admin | admin | ..." - achado do Claude Web: ~40 linhas pra mostrar o
// que uma matriz mostra em muito menos espaço). Não usa GenericTable - é
// um formato fundamentalmente diferente (matriz, não lista de linha+ações).
//
// Clicável desde 03-08-2026 (pedido do Lucas: "o administrador precisa ter
// poder absoluto pelo painel admin, nunca mais precisará acessar o banco
// depois") - cada célula agora concede/revoga a permissão daquele papel,
// via `papelPermissaoApi.atribuir/remover` (RLS exige a permissão
// 'papel_gerenciar', ver [04-B-1] em 04_rls_policies.sql).
//
// Linhas/colunas vêm do CATÁLOGO COMPLETO (`papelApi`/`permissaoApi`), não
// só das combinações já concedidas (`papelPermissaoApi.listar`) - senão um
// papel ou permissão sem nenhum vínculo hoje (ex.: 'usuario',
// 'pesquisador') nunca apareceria pra admin conceder a primeira permissão
// a ele pelo painel, o que contradiz o próprio objetivo de "nunca precisar
// mexer no banco". `papel`/`permissao` em si continuam só-leitura - criar
// um papel ou permissão novos (não só conceder uma combinação já
// existente) é decisão maior, fora de escopo aqui.
const TEXTO_TOOLTIP_MATRIZ =
  'Todo papel e toda permissão cadastrados aparecem aqui, mesmo sem ' +
  "nenhum vínculo ainda (ex.: 'usuario'/'pesquisador' começam sem nenhuma " +
  'permissão nomeada, o acesso deles normalmente é por serem donos do ' +
  'próprio dado, não por permissão, mas nada impede conceder uma se ' +
  'precisar). Clique numa célula pra conceder ou revogar.';

// Colunas em ordem de poder (maior pro menor), não alfabética - pedido do
// Lucas, 03-08-2026.
//
// CORRIGIDO (07-08-2026, achado do Lucas: "renomeei 'admin' pra 'admin
// teste' e a coluna pulou pro fim da matriz"): a ordenação comparava o
// NOME contra uma lista fixa de nomes esperados - assim que o admin usa o
// recurso de renomear papel (alterar-papel.jsx, também 07-08-2026), o nome
// novo não bate com nada da lista e a coluna cai pro fim. `id_papel` nunca
// muda (só `nome` é editável) e, desde a reordenação do seed
// (07_seed_dados.sql [07-B-1], mesma data), já nasce na ordem de poder
// certa num banco novo - ordenar por ele resolve os dois problemas de
// uma vez, sem precisar de lista nenhuma pra manter sincronizada.
function ordenarPapeisPorPoder(a, b) {
  return a.idPapel - b.idPapel;
}

export function MatrizPapelPermissao({ authFetch }) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [papeis, setPapeis] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [concedidos, setConcedidos] = useState(new Set());
  const [carregando, setCarregando] = useState(true);
  const [celulaAlterando, setCelulaAlterando] = useState(null);

  const recarregar = useCallback(() => {
    setCarregando(true);
    limparErro();
    Promise.all([
      papelApi.listar(authFetch),
      permissaoApi.listar(authFetch),
      papelPermissaoApi.listar(authFetch),
    ])
      .then(([listaPapeis, listaPermissoes, vinculos]) => {
        setPapeis([...listaPapeis].sort(ordenarPapeisPorPoder));
        // Ordena pelo nome AMIGÁVEL (09-08-2026), não pelo código cru - é
        // o que aparece na tela, então é o que precisa estar em ordem
        // alfabética visível pra quem lê.
        setPermissoes(
          [...listaPermissoes].sort((a, b) =>
            nomeAmigavelPermissao(a.nome).localeCompare(nomeAmigavelPermissao(b.nome)),
          ),
        );
        setConcedidos(new Set(vinculos.map((v) => `${v.idPapel}-${v.idPermissao}`)));
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar();
  }, [recarregar]);

  const alternar = async (idPapel, nomePapel, idPermissao, nomePermissao, concedidoAtual) => {
    const chave = `${idPapel}-${idPermissao}`;
    limparErro();
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
      reportarErro(erroRequisicao);
    } finally {
      setCelulaAlterando(null);
    }
  };

  return (
    <section className="crud-secao">
      <h2 className="titulo-secao flex items-center">
        Papel × Permissão
        <Tooltip texto={TEXTO_TOOLTIP_MATRIZ} />
      </h2>

      {carregando ? (
        <div className="animate-pulse h-32 fundo-sutil rounded"></div>
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
                  {/* title com o código cru (09-08-2026) - a matriz é
                      estreita demais pra uma coluna "chave" própria (igual
                      a listagem de Permissões abaixo); hover cobre o
                      mesmo caso de uso pra quem precisa do valor literal. */}
                  <td title={permissao.nome}>{nomeAmigavelPermissao(permissao.nome)}</td>
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
                              nomeAmigavelPermissao(permissao.nome),
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
                              ? 'texto-sucesso hover:bg-emerald-100'
                              : 'texto-fraco opacity-50 hover-fundo-sutil hover:opacity-100')
                          }
                        >
                          {celulaAlterando === chave ? '…' : temPermissao ? '✓' : '-'}
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
