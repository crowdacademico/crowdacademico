import { useCallback, useEffect, useState } from 'react';
import { Dica, Tooltip } from '../../components/layout/tooltip';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import {
  papelApi,
  papelPermissaoApi,
  permissaoApi,
} from '../../services/2-papel-permissao/api/papel-permissao.api';
import { nomeAmigavelPermissao } from '../../services/2-papel-permissao/constants/permissao-nomes-amigaveis';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { PapelResponse, PermissaoResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';

// Matriz Papel × Permissão: mostra em muito menos espaço o que uma tabela de linhas repetindo "admin | admin |
// ..." (~40 linhas) mostraria. Não usa GenericTable: é um formato fundamentalmente diferente (matriz, não lista
// de linha+ações).
//
// Clicável: cada célula concede/revoga a permissão daquele papel, via `papelPermissaoApi.atribuir/remover` (RLS
// exige a permissão 'papel_gerenciar', ver [04-B-1] em 04_rls_policies.sql), para o administrador nunca
// precisar mexer no banco.
//
// Linhas/colunas vêm do CATÁLOGO COMPLETO (`papelApi`/`permissaoApi`), não só das combinações já concedidas
// (`papelPermissaoApi.listar`): senão um papel ou permissão sem nenhum vínculo hoje (ex.: 'usuario',
// 'pesquisador') nunca apareceria para o admin conceder a primeira permissão a ele pelo painel.
// `papel`/`permissao` em si continuam só-leitura: criar um papel ou permissão novos (não só conceder uma
// combinação já existente) é decisão maior, fora de escopo aqui.
const TEXTO_TOOLTIP_MATRIZ =
  'Todo papel e toda permissão cadastrados aparecem aqui, mesmo sem ' +
  "nenhum vínculo ainda (ex.: 'usuario'/'pesquisador' começam sem nenhuma " +
  'permissão nomeada, o acesso deles normalmente é por serem donos do ' +
  'próprio dado, não por permissão, mas nada impede conceder uma se ' +
  'precisar). Clique numa célula pra conceder ou revogar.';

// Colunas em ordem de poder (maior para o menor), não alfabética. A ordenação usa `id_papel`, não o NOME contra
// uma lista fixa de nomes esperados: assim que o admin renomeia um papel (alterar-papel), o nome novo não
// bateria com nada da lista e a coluna cairia para o fim. `id_papel` nunca muda (só `nome` é editável) e, desde
// a ordem do seed (07_seed_dados.sql [07-B-1]), já nasce na ordem de poder certa num banco novo: ordenar por
// ele resolve os dois problemas de uma vez, sem lista nenhuma para manter sincronizada.
function ordenarPapeisPorPoder(a: PapelResponse, b: PapelResponse): number {
  return a.idPapel - b.idPapel;
}

interface MatrizPapelPermissaoProps {
  authFetch: AuthFetch;
}

export function MatrizPapelPermissao({ authFetch }: MatrizPapelPermissaoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [papeis, setPapeis] = useState<PapelResponse[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoResponse[]>([]);
  const [concedidos, setConcedidos] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [celulaAlterando, setCelulaAlterando] = useState<string | null>(null);

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
        // Ordena pelo nome AMIGÁVEL, não pelo código cru: é o que aparece na tela, então é o que precisa estar
        // em ordem alfabética visível para quem lê.
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

  const alternar = async (
    idPapel: number,
    nomePapel: string,
    idPermissao: number,
    nomePermissao: string,
    concedidoAtual: boolean,
  ) => {
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
                  {/* title com o código cru: a matriz é estreita demais para uma coluna "chave" própria
                      (como a listagem de Permissões abaixo); o hover cobre o mesmo caso de uso para quem
                      precisa do valor literal. ÚNICO `title` nativo que sobrevive no sistema: `<td>` não é
                      interativo nem focável, e o propósito é revelar um valor cru truncado/traduzido, não
                      nomear um controle. Todo o resto do sistema usa `.dica`/`<Dica>` (ver
                      components/layout/tooltip.tsx). */}
                  <td title={permissao.nome}>{nomeAmigavelPermissao(permissao.nome)}</td>
                  {papeis.map((papel) => {
                    const chave = `${papel.idPapel}-${permissao.idPermissao}`;
                    const temPermissao = concedidos.has(chave);
                    return (
                      <td key={papel.idPapel} className="text-center">
                        {/* 37 permissões × 7 papéis = 259 botões com `.dica` em tela ao mesmo tempo:
                            aceitável (259 <span> é irrelevante para o navegador), registrado aqui para uma
                            medição futura de performance saber onde olhar primeiro se algum dia isto pesar. */}
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
                          aria-label={
                            temPermissao
                              ? `Clique pra revogar de "${papel.nome}"`
                              : `Clique pra conceder pra "${papel.nome}"`
                          }
                          className={
                            'dica w-7 h-7 rounded-md font-bold transition-colors disabled:opacity-50 disabled:cursor-wait ' +
                            (temPermissao
                              ? 'texto-sucesso hover-fundo-sucesso'
                              : 'texto-fraco opacity-50 hover-fundo-sutil hover:opacity-100')
                          }
                        >
                          {celulaAlterando === chave ? '…' : temPermissao ? '✓' : '-'}
                          <Dica
                            texto={
                              temPermissao
                                ? `Clique pra revogar de "${papel.nome}"`
                                : `Clique pra conceder pra "${papel.nome}"`
                            }
                          />
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
