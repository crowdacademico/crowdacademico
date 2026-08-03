import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

// Aba "Usuários" do painel admin — vive na rota /admin/usuarios (ver
// services/router/rotas.constants.js, ROTAS_ADMIN). Renderizada dentro do
// <Outlet/> de views/admin/admin-layout.jsx (sidebar + área de conteúdo já
// prontos por fora, esta view só cuida do próprio conteúdo).
export function ListarUsuarios({ auth }) {
  // useCallback aqui não é sobre performance — é porque GenericTable usa a
  // função em `useEffect([listar])`; sem isso, cada render criaria uma
  // função nova e recarregaria a tabela em loop.
  const listarUsuarios = useCallback(() => usuarioApi.listar(auth.authFetch), [auth.authFetch]);
  // 'usuario' é o nome FÍSICO da tabela no Postgres (bate com
  // fn_log_auditoria() via TG_TABLE_NAME), não o nome da rota.
  const buscarLogUsuario = useCallback(
    () => logAuditoriaApi.listarPorTabela(auth.authFetch, 'usuario'),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Usuários"
        acaoTopo={
          <Link to="/usuarios/criar" className="btn btn-primary">
            Criar
          </Link>
        }
        colunas={[
          { chave: 'idUsuario', rotulo: 'id' },
          { chave: 'nome', rotulo: 'nome' },
          { chave: 'email', rotulo: 'email' },
          { chave: 'emailVerificado', rotulo: 'e-mail verificado' },
        ]}
        chavePrimaria="idUsuario"
        listar={listarUsuarios}
        rotaBase="/usuarios"
        buscarLog={buscarLogUsuario}
      />
    </div>
  );
}
