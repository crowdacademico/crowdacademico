import { useEffect, useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { papelPermissaoApi, permissaoApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { detalhePermissao } from '../../services/2-papel-permissao/constants/permissao-nomes-amigaveis';
import { ModalDetalhePermissao } from './modal-detalhe-permissao';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { PapelResponse, PermissaoResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';

interface ModalConsultarPapelProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  papel: PapelResponse;
  aoFechar: () => void;
}

// Consultar - novo (14-09-2026, pedido do Lucas: "podemos colocar
// informações ali dentro, sobre os atributos de cada papel... e suas
// permissões"). `PapelResponse` só tem `idPapel`/`nome` (o `codigo` estável
// nunca é exposto pela API, de propósito) - o dado que realmente falta
// mostrar são as permissões concedidas, lidas ao vivo da matriz Papel ×
// Permissão (mesmas 2 chamadas de matriz-papel-permissao.tsx/modal-
// detalhe-permissao.tsx), nunca hardcoded. Cada badge abre o MESMO
// `ModalDetalhePermissao` que a tabela de Permissões já usa pro botão
// "Saiba mais" - zero lógica de detalhe duplicada.
export function ModalConsultarPapel({ auth, papel, aoFechar }: ModalConsultarPapelProps) {
  const [permissoes, setPermissoes] = useState<PermissaoResponse[] | null>(null);
  const [permissaoDetalhada, setPermissaoDetalhada] = useState<PermissaoResponse | null>(null);

  useEffect(() => {
    Promise.all([permissaoApi.listar(auth.authFetch), papelPermissaoApi.listar(auth.authFetch)])
      .then(([todasPermissoes, vinculos]) => {
        const idsDoPapel = new Set(
          vinculos.filter((v) => v.idPapel === papel.idPapel).map((v) => v.idPermissao),
        );
        setPermissoes(todasPermissoes.filter((p) => idsDoPapel.has(p.idPermissao)));
      })
      .catch(() => setPermissoes([]));
  }, [auth.authFetch, papel.idPapel]);

  return (
    <>
      <ModalFicha
        titulo={papel.nome}
        aoFechar={aoFechar}
        rodape={
          <button type="button" onClick={aoFechar} className="btn btn-secondary w-full max-w-sm ml-auto">
            Fechar
          </button>
        }
      >
        <SecaoFicha titulo="Dados">
          <CampoFicha rotulo="id" valor={papel.idPapel} />
          <CampoFicha rotulo="Nome" valor={papel.nome} largura="cheia" />
        </SecaoFicha>

        <SecaoFicha titulo="Permissões deste papel" colunas={1}>
          {permissoes === null ? (
            <p className="text-sm texto-fraco">Carregando...</p>
          ) : permissoes.length === 0 ? (
            <p className="text-sm texto-fraco">Nenhuma permissão concedida a este papel ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {permissoes.map((permissao) => (
                <button
                  key={permissao.idPermissao}
                  type="button"
                  onClick={() => setPermissaoDetalhada(permissao)}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  {detalhePermissao(permissao.nome).nome}
                </button>
              ))}
            </div>
          )}
        </SecaoFicha>
      </ModalFicha>

      {permissaoDetalhada && (
        <ModalDetalhePermissao
          permissao={permissaoDetalhada}
          authFetch={auth.authFetch}
          aoFechar={() => setPermissaoDetalhada(null)}
        />
      )}
    </>
  );
}

interface ModalExcluirPapelProps {
  papel: PapelResponse;
  aoFechar: () => void;
}

// Excluir - só explicativo, de propósito (14-09-2026, pedido do Lucas: "o
// ícone da lixeira... um modal pequeno explicando isto, sem opção de
// confirmar"). Diferente de todo outro "Excluir" do sistema, este nunca
// chama a API - `usuario_papel`/`papel_permissao` apontam pra `papel` com
// `ON DELETE CASCADE` (confirmado em 01_extensoes_enums_tabelas.sql):
// excluir um papel apagaria, na hora e sem aviso, o vínculo de TODOS os
// usuários que têm esse papel e TODAS as permissões concedidas a ele -
// qualquer conta com este papel perderia a autoridade instantaneamente,
// sistema inteiro. Diferente de Excluir Usuário/Motivo de Denúncia/etc
// (exclusão lógica ou bloqueada por FK com mensagem própria), aqui o risco
// é grande demais pra existir como ação de painel - o ícone continua no
// lugar certo (padroniza a coluna Ações com todo o resto do sistema), só
// que clicar nele explica o motivo em vez de perguntar "tem certeza?".
export function ModalExcluirPapel({ papel, aoFechar }: ModalExcluirPapelProps) {
  return (
    <ModalFicha
      titulo={`Excluir "${papel.nome}"?`}
      aoFechar={aoFechar}
      rodape={
        <button type="button" onClick={aoFechar} className="btn btn-secondary w-full max-w-sm ml-auto">
          Entendi
        </button>
      }
    >
      <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
        <p className="font-bold mb-1">
          <i className="fa-solid fa-triangle-exclamation mr-1"></i> Não é possível excluir papéis pelo painel
        </p>
        <p>
          Excluir "{papel.nome}" apagaria, na hora e sem aviso, o vínculo de TODOS os usuários que
          têm este papel e TODAS as permissões concedidas a ele - qualquer conta com este papel
          perderia essa autoridade instantaneamente, em todo o sistema. Por isso este botão nunca
          executa a exclusão de verdade, só explica por que ela não existe aqui.
        </p>
      </div>
    </ModalFicha>
  );
}
