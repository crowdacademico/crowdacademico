import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

// Aba "Usuários" do painel admin — vive na rota /admin/usuarios (ver
// services/router/rotas.constants.js, ROTAS_ADMIN). Renderizada dentro do
// <Outlet/> de views/admin/admin-layout.jsx (sidebar + área de conteúdo já
// prontos por fora, esta view só cuida do próprio conteúdo).
export function ListarUsuarios({ auth }) {
  // useCallback aqui não é sobre performance — é porque GenericTable usa a
  // função em `useEffect([listar])`; sem isso, cada render criaria uma
  // função nova e recarregaria a tabela em loop.
  const listarUsuarios = useCallback(() => usuarioApi.listar(auth.authFetch), [auth.authFetch]);

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
          { chave: 'nome', rotulo: 'nome', editavel: true },
          { chave: 'email', rotulo: 'email' },
          { chave: 'emailVerificado', rotulo: 'e-mail verificado' },
        ]}
        chavePrimaria="idUsuario"
        campoRotulo="nome"
        listar={listarUsuarios}
        atualizar={(id, dados) => usuarioApi.atualizar(auth.authFetch, id, dados)}
        remover={(id) => usuarioApi.remover(auth.authFetch, id)}
      />
    </div>
  );
}
