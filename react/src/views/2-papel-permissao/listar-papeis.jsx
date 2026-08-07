import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { papelApi, permissaoApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';
import { MatrizPapelPermissao } from './matriz-papel-permissao';

// Aba "Papéis & Permissões" do painel admin — rota /admin/papeis. Reúne 3
// blocos read-only/de gestão do módulo 2-papel-permissao (ver nest/src/
// 2-papel-permissao) numa página só, porque nenhum dos 3 sozinho justifica
// uma aba própria no menu.
//
// REMOVIDO (07-08-2026, pedido do Lucas: "não consigo usar, é confuso"): o
// 4º bloco era UsuarioPapelWidget — digitar id_usuario/id_papel cru pra
// atribuir/revogar. Redundante desde que alterar-usuario.jsx ganhou uma
// seção "Papéis" de verdade (etiquetas + menu suspenso só com o que falta
// atribuir) — a mesma ação, só que mais clara. Não sobrou nenhuma
// funcionalidade órfã: tudo que o widget fazia, Alterar Usuário já faz.
export function ListarPapeis({ auth }) {
  const listarPapeis = useCallback(() => papelApi.listar(auth.authFetch), [auth.authFetch]);
  const listarPermissoes = useCallback(
    () => permissaoApi.listar(auth.authFetch),
    [auth.authFetch],
  );
  // 'papel' é o nome FÍSICO da tabela no Postgres (bate com TG_TABLE_NAME
  // em fn_log_auditoria(), trg_log_auditoria_papel, 07-08-2026) — mesma
  // convenção de buscarLogUsuario em listar-usuarios.jsx.
  const buscarLogPapel = useCallback(
    () => logAuditoriaApi.listarPorTabela(auth.authFetch, 'papel'),
    [auth.authFetch],
  );

  return (
    <>
      <div className="admin-content-painel">
        <GenericTable
          titulo="Papéis"
          colunas={[
            { chave: 'idPapel', rotulo: 'id' },
            { chave: 'nome', rotulo: 'nome' },
          ]}
          chavePrimaria="idPapel"
          listar={listarPapeis}
          rotaBase="/papeis"
          acoes={['alterar']}
          buscarLog={buscarLogPapel}
        />
      </div>
      <div className="admin-content-painel">
        <GenericTable
          titulo="Permissões (catálogo, só leitura)"
          colunas={[
            { chave: 'idPermissao', rotulo: 'id' },
            { chave: 'nome', rotulo: 'nome' },
          ]}
          chavePrimaria="idPermissao"
          listar={listarPermissoes}
        />
      </div>
      <div className="admin-content-painel">
        <MatrizPapelPermissao authFetch={auth.authFetch} />
      </div>
    </>
  );
}
