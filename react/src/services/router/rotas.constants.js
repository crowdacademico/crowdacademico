import { LoginPage } from '../../views/3-auth/login-page';
import { CriarUsuario } from '../../views/1-usuario/criar-usuario';
import { AlterarUsuario } from '../../views/1-usuario/alterar-usuario';
import { ConsultarUsuario } from '../../views/1-usuario/consultar-usuario';
import { ExcluirUsuario } from '../../views/1-usuario/excluir-usuario';
import { ListarUsuarios } from '../../views/1-usuario/listar-usuarios';
import { ListarPapeis } from '../../views/2-papel-permissao/listar-papeis';
import { AlterarPapel } from '../../views/2-papel-permissao/alterar-papel';
import { CriarConfiguracao } from '../../views/11-configuracoes/criar-configuracao';
import { AlterarConfiguracao } from '../../views/11-configuracoes/alterar-configuracao';
import { ConsultarConfiguracao } from '../../views/11-configuracoes/consultar-configuracao';
import { ExcluirConfiguracao } from '../../views/11-configuracoes/excluir-configuracao';
import { ListarConfiguracoes } from '../../views/11-configuracoes/listar-configuracoes';

// Fonte única de verdade pra "quais páginas existem" — App.jsx monta as
// <Route> a partir daqui, e breadcrumb.jsx monta o rótulo a partir daqui.
// rotuloBreadcrumb: null = não aparece no breadcrumb.
//
// Duas listas, não uma, porque descrevem coisas diferentes: ROTAS são
// páginas soltas (Header/Breadcrumb/Footer, sem sidebar); ROTAS_ADMIN são
// as abas do painel — cada uma virou rota de verdade (/admin/usuarios,
// /admin/papeis, /admin/configuracoes) precisamente pra sumir com o
// problema que a gente tinha antes (abas eram só estado local, sem URL:
// sem link direto, botão Voltar não funcionava, F5 sempre voltava pra
// "Usuários"). Renderizadas dentro do <Outlet/> de
// views/admin/admin-layout.jsx (sidebar + área de conteúdo compartilhadas).
//
// rotuloMenu é o que aparece no menu lateral (admin-sidebar.jsx via
// admin-menu.constants.js) — é a MESMA lista, não uma 3ª cópia: antes o
// menu lateral (GRUPOS_MENU_ADMIN) e as rotas eram duas listas separadas
// que podiam desalinhar; agora o menu lê ROTAS_ADMIN direto.
export const ROTAS = [
  { caminho: '/login', elemento: LoginPage, rotuloBreadcrumb: 'Login' },
  { caminho: '/usuarios/criar', elemento: CriarUsuario, rotuloBreadcrumb: 'Criar Usuário' },
  {
    caminho: '/usuarios/:id/alterar',
    elemento: AlterarUsuario,
    rotuloBreadcrumb: 'Alterar Usuário',
  },
  {
    caminho: '/usuarios/:id/consultar',
    elemento: ConsultarUsuario,
    rotuloBreadcrumb: 'Consultar Usuário',
  },
  {
    caminho: '/usuarios/:id/excluir',
    elemento: ExcluirUsuario,
    rotuloBreadcrumb: 'Excluir Usuário',
  },
  {
    caminho: '/papeis/:id/alterar',
    elemento: AlterarPapel,
    rotuloBreadcrumb: 'Alterar Papel',
  },
  {
    caminho: '/configuracoes/criar',
    elemento: CriarConfiguracao,
    rotuloBreadcrumb: 'Criar Configuração',
  },
  {
    caminho: '/configuracoes/:id/alterar',
    elemento: AlterarConfiguracao,
    rotuloBreadcrumb: 'Alterar Configuração',
  },
  {
    caminho: '/configuracoes/:id/consultar',
    elemento: ConsultarConfiguracao,
    rotuloBreadcrumb: 'Consultar Configuração',
  },
  {
    caminho: '/configuracoes/:id/excluir',
    elemento: ExcluirConfiguracao,
    rotuloBreadcrumb: 'Excluir Configuração',
  },
];

export const ROTAS_ADMIN = [
  {
    caminho: '/admin/usuarios',
    caminhoRelativo: 'usuarios',
    elemento: ListarUsuarios,
    rotuloMenu: 'Usuários',
    // null: esta é a aba padrão (o que "/" redireciona pra ela) — mostrar
    // "Início > Usuários" seria redundante com o próprio link "Início".
    rotuloBreadcrumb: null,
  },
  {
    caminho: '/admin/papeis',
    caminhoRelativo: 'papeis',
    elemento: ListarPapeis,
    rotuloMenu: 'Papéis & Permissões',
    rotuloBreadcrumb: 'Papéis & Permissões',
  },
  {
    caminho: '/admin/configuracoes',
    caminhoRelativo: 'configuracoes',
    elemento: ListarConfiguracoes,
    rotuloMenu: 'Configurações',
    rotuloBreadcrumb: 'Configurações',
  },
];
