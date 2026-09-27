import { useState } from 'react';
import { Tooltip } from '../../components/layout/tooltip';
import { TabelaPapelPermissao } from '../../components/crud/tabelas/6-tabela-papel-permissao';
import { chaveCelula } from '../../services/2-papel-permissao/util/chave-celula-matriz.util';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { useBuscar } from '../../services/constant/hook/use-buscar';
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
  const [celulaAlterando, setCelulaAlterando] = useState<string | null>(null);

  // Papéis do menor para o maior poder; permissões pelo nome AMIGÁVEL (é o que aparece na tela, então é o que
  // precisa estar em ordem alfabética visível para quem lê).
  const { dado, carregando, recarregar } = useBuscar(
    () =>
      Promise.all([papelApi.listar(authFetch), permissaoApi.listar(authFetch), papelPermissaoApi.listar(authFetch)]).then(
        ([listaPapeis, listaPermissoes, vinculos]) => ({
          papeis: [...listaPapeis].sort(ordenarPapeisPorPoder),
          permissoes: [...listaPermissoes].sort((a, b) =>
            nomeAmigavelPermissao(a.nome).localeCompare(nomeAmigavelPermissao(b.nome)),
          ),
          concedidos: new Set(vinculos.map((v) => chaveCelula(v.idPapel, v.idPermissao))),
        }),
      ),
    [authFetch],
    { erros: { erro, reportarErro, limparErro } },
  );
  const papeis = dado?.papeis ?? [];
  const permissoes = dado?.permissoes ?? [];
  const concedidos = dado?.concedidos ?? new Set<string>();

  const alternar = async (papel: PapelResponse, permissao: PermissaoResponse, concedidoAtual: boolean) => {
    const { idPapel, nome: nomePapel } = papel;
    const { idPermissao } = permissao;
    const nomePermissao = nomeAmigavelPermissao(permissao.nome);
    limparErro();
    setCelulaAlterando(chaveCelula(idPapel, idPermissao));
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
        <TabelaPapelPermissao
          papeis={papeis}
          permissoes={permissoes}
          concedidos={concedidos}
          celulaAlterando={celulaAlterando}
          aoAlternar={(papel, permissao, concedido) => void alternar(papel, permissao, concedido)}
        />
      )}

      {erro && <p className="crud-erro">{erro}</p>}
    </section>
  );
}
