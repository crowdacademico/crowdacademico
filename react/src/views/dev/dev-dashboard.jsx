import { useCallback } from 'react';
import { GenericTable } from '../../components/devtools/generic-table';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import {
  papelApi,
  papelPermissaoApi,
  permissaoApi,
} from '../../services/2-papel-permissao/api/papel-permissao.api';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { useAuth } from '../../services/3-auth/hook/use-auth';
import './devtools.css';
import { LoginForm } from './login-form';
import { UsuarioPapelWidget } from './usuario-papel-widget';

// A tela inteira desta rodada: login + 5 blocos de CRUD/consulta, um por
// módulo já implementado (1-usuario, 2-papel-permissao, 11-configuracoes).
// Rota única, sem router — "básico do básico" pedido, só pra ver o CRUD
// funcionando e provar RLS antes de qualquer tela de verdade do site.
export function DevDashboard() {
  const auth = useAuth();

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
    <div className="devtools-dashboard">
      <header className="devtools-header">
        <div>
          <strong>CrowdAcadêmico — devtools</strong>
          <p className="devtools-subtitulo">
            Ferramenta interna só pra testar CRUD + RLS. Não é a tela de admin de
            verdade. Sem usuário ainda? Crie um no bloco "Usuários" abaixo (não
            exige login) e depois logue aqui.
          </p>
        </div>
        {auth.carregando ? (
          <span>Carregando sessão...</span>
        ) : auth.autenticado ? (
          <div className="devtools-sessao">
            <span>
              <strong>{auth.usuario?.nome ?? 'logado'}</strong> ({auth.usuario?.email})
            </span>
            <button onClick={auth.logout}>Sair</button>
          </div>
        ) : (
          <LoginForm login={auth.login} />
        )}
      </header>

      <GenericTable
        titulo="Usuários (1-usuario)"
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

      <GenericTable
        titulo="Papéis (papel) — catálogo, só leitura"
        colunas={[
          { chave: 'idPapel', rotulo: 'id' },
          { chave: 'nome', rotulo: 'nome' },
        ]}
        chavePrimaria="idPapel"
        listar={listarPapeis}
      />

      <GenericTable
        titulo="Permissões (permissao) — catálogo, só leitura"
        colunas={[
          { chave: 'idPermissao', rotulo: 'id' },
          { chave: 'nome', rotulo: 'nome' },
        ]}
        chavePrimaria="idPermissao"
        listar={listarPermissoes}
      />

      <GenericTable
        titulo="Papel × Permissão (papel_permissao) — catálogo, só leitura"
        colunas={[
          { chave: 'idPapel', rotulo: 'id_papel' },
          { chave: 'nomePapel', rotulo: 'papel' },
          { chave: 'idPermissao', rotulo: 'id_permissao' },
          { chave: 'nomePermissao', rotulo: 'permissão' },
        ]}
        chavePrimaria="idPermissao"
        listar={listarPapelPermissao}
      />

      <UsuarioPapelWidget authFetch={auth.authFetch} />

      <GenericTable
        titulo="Configurações (11-configuracoes)"
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
  );
}
