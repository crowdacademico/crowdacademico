import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { papelApi, permissaoApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { MatrizPapelPermissao } from './matriz-papel-permissao';
import { UsuarioPapelWidget } from './usuario-papel-widget';

// Aba "Papéis & Permissões" do painel admin — rota /admin/papeis. Reúne 4
// blocos read-only/de gestão do módulo 2-papel-permissao (ver nest/src/
// 2-papel-permissao) numa página só, porque nenhum dos 4 sozinho justifica
// uma aba própria no menu.
export function ListarPapeis({ auth }) {
  const listarPapeis = useCallback(() => papelApi.listar(auth.authFetch), [auth.authFetch]);
  const listarPermissoes = useCallback(
    () => permissaoApi.listar(auth.authFetch),
    [auth.authFetch],
  );

  return (
    <>
      <div className="admin-content-painel">
        <GenericTable
          titulo="Papéis (catálogo, só leitura)"
          colunas={[
            { chave: 'idPapel', rotulo: 'id' },
            { chave: 'nome', rotulo: 'nome' },
          ]}
          chavePrimaria="idPapel"
          listar={listarPapeis}
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
      <div className="admin-content-painel">
        <UsuarioPapelWidget authFetch={auth.authFetch} />
      </div>
    </>
  );
}
