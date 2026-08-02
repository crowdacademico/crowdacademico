import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/devtools/generic-table';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import {
  papelApi,
  papelPermissaoApi,
  permissaoApi,
} from '../../services/2-papel-permissao/api/papel-permissao.api';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { AdminSidebar } from './admin-sidebar';
import { UsuarioPapelWidget } from './usuario-papel-widget';

// Painel administrativo — menu lateral fixo à esquerda (admin-sidebar.jsx)
// e um painel de conteúdo à direita por aba selecionada. Header/Footer
// vêm de fora (components/layout/layout.jsx, via App.jsx) — esta é só a
// página em si, renderizada dentro do <Outlet/> da rota "/". `auth` também
// vem de fora (useAuth chamado uma vez só em App.jsx). Só 3 abas têm
// conteúdo real hoje (Usuários, Papéis & Permissões, Configurações — os
// módulos que já existem no Nest); o resto do menu aparece desabilitado,
// mostrando a forma do painel completo sem fingir que uma tela que não
// existe funciona.
export function AdminDashboard({ auth }) {
  const [abaAtiva, setAbaAtiva] = useState('usuarios');

  // useCallback aqui não é sobre performance — é porque GenericTable usa a
  // função em `useEffect([listar])`; sem isso, cada render criaria uma
  // função nova e recarregaria a tabela em loop.
  const listarUsuarios = useCallback(() => usuarioApi.listar(auth.authFetch), [auth.authFetch]);
  const listarPapeis = useCallback(() => papelApi.listar(auth.authFetch), [auth.authFetch]);
  const listarPermissoes = useCallback(
    () => permissaoApi.listar(auth.authFetch),
    [auth.authFetch],
  );
  const listarPapelPermissao = useCallback(
    () => papelPermissaoApi.listar(auth.authFetch),
    [auth.authFetch],
  );
  const listarConfiguracoes = useCallback(
    () => configuracaoApi.listar(auth.authFetch),
    [auth.authFetch],
  );

  return (
    <main className="admin-pagina">
      <div className="admin-shell">
        <AdminSidebar abaAtiva={abaAtiva} aoSelecionar={setAbaAtiva} />

        <div className="admin-content-area">
          <div className="admin-content-area__inner">
            {abaAtiva === 'usuarios' && (
              <div className="admin-content-painel">
                <GenericTable
                  titulo="Usuários"
                  acaoTopo={
                    <Link
                      to="/usuarios/criar"
                      className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                    >
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
                  listar={listarUsuarios}
                  atualizar={(id, dados) => usuarioApi.atualizar(auth.authFetch, id, dados)}
                  remover={(id) => usuarioApi.remover(auth.authFetch, id)}
                />
              </div>
            )}

            {abaAtiva === 'papeis' && (
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
                  <GenericTable
                    titulo="Papel × Permissão (catálogo, só leitura)"
                    colunas={[
                      { chave: 'idPapel', rotulo: 'id_papel' },
                      { chave: 'nomePapel', rotulo: 'papel' },
                      { chave: 'idPermissao', rotulo: 'id_permissao' },
                      { chave: 'nomePermissao', rotulo: 'permissão' },
                    ]}
                    chavePrimaria="idPermissao"
                    listar={listarPapelPermissao}
                  />
                </div>
                <div className="admin-content-painel">
                  <UsuarioPapelWidget authFetch={auth.authFetch} />
                </div>
              </>
            )}

            {abaAtiva === 'configuracoes' && (
              <div className="admin-content-painel">
                <GenericTable
                  titulo="Configurações"
                  colunas={[
                    { chave: 'idConfig', rotulo: 'id' },
                    { chave: 'chave', rotulo: 'chave' },
                    { chave: 'valor', rotulo: 'valor', editavel: true },
                    { chave: 'tipo', rotulo: 'tipo' },
                    { chave: 'ativo', rotulo: 'ativo' },
                  ]}
                  chavePrimaria="idConfig"
                  listar={listarConfiguracoes}
                  criar={(dados) => configuracaoApi.criar(auth.authFetch, dados)}
                  camposCriar={[
                    { chave: 'chave', rotulo: 'chave' },
                    { chave: 'valor', rotulo: 'valor' },
                    { chave: 'tipo', rotulo: 'tipo (decimal/inteiro/texto/booleano)' },
                    { chave: 'descricao', rotulo: 'descrição' },
                  ]}
                  atualizar={(id, dados) => configuracaoApi.atualizar(auth.authFetch, id, dados)}
                  remover={(id) => configuracaoApi.remover(auth.authFetch, id)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
