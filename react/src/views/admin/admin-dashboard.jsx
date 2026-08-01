import { useCallback, useState } from 'react';
import { Footer } from '../../components/layout/footer';
import { Header } from '../../components/layout/header';
import { GenericTable } from '../../components/devtools/generic-table';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import {
  papelApi,
  papelPermissaoApi,
  permissaoApi,
} from '../../services/2-papel-permissao/api/papel-permissao.api';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { useAuth } from '../../services/3-auth/hook/use-auth';
import { AdminSidebar } from './admin-sidebar';
import { UsuarioPapelWidget } from './usuario-papel-widget';

// Painel administrativo — Header/Footer fixos (components/layout), menu
// lateral fixo à esquerda (admin-sidebar.jsx) e um painel de conteúdo à
// direita por aba selecionada. Só 3 abas têm conteúdo real hoje (Usuários,
// Papéis & Permissões, Configurações — os módulos que já existem no Nest);
// o resto do menu aparece desabilitado, mostrando a forma do painel
// completo sem fingir que uma tela que não existe funciona.
export function AdminDashboard() {
  const auth = useAuth();
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
    <>
      <Header auth={auth} />

      <main className="admin-pagina">
        <div className="admin-shell">
          <AdminSidebar abaAtiva={abaAtiva} aoSelecionar={setAbaAtiva} />

          <div className="admin-content-area">
            {abaAtiva === 'usuarios' && (
              <div className="admin-content-painel">
                <p className="admin-aviso">
                  Sem usuário ainda? Crie um aqui embaixo — não exige login — e
                  depois entre pelo campo no cabeçalho.
                </p>
                <GenericTable
                  titulo="Usuários"
                  colunas={[
                    { chave: 'idUsuario', rotulo: 'id' },
                    { chave: 'nome', rotulo: 'nome', editavel: true },
                    { chave: 'email', rotulo: 'email' },
                    { chave: 'emailVerificado', rotulo: 'e-mail verificado' },
                  ]}
                  chavePrimaria="idUsuario"
                  listar={listarUsuarios}
                  criar={(dados) => usuarioApi.criar(auth.authFetch, dados)}
                  camposCriar={[
                    { chave: 'nome', rotulo: 'nome' },
                    { chave: 'email', rotulo: 'email' },
                    { chave: 'senha', rotulo: 'senha' },
                  ]}
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
      </main>

      <Footer />
    </>
  );
}
