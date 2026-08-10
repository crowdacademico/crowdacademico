import { LoginPage } from '../../views/3-auth/login-page';
import { CadastroPage } from '../../views/3-auth/cadastro-page';
import { VerificarEmailPage } from '../../views/3-auth/verificar-email-page';
import { MinhaConta } from '../../views/3-auth/minha-conta-page';
import { Dashboard } from '../../views/admin/dashboard';
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
// páginas PÚBLICAS/pré-login (Header/Breadcrumb/Footer, sem sidebar) —
// login, cadastro, verificar e-mail. ROTAS_ADMIN é TUDO que precisa do
// menu lateral (10-08-2026, pedido do Lucas: "não tem pq o menu lateral
// sumir" em Alterar/Consultar/Excluir/Minha Conta — antes essas telas
// viviam em ROTAS, por isso perdiam o menu E o breadcrumb não sabia de
// qual listagem elas vieram). Renderizadas dentro do <Outlet/> de
// views/admin/admin-layout.jsx (sidebar + área de conteúdo compartilhadas).
//
// rotuloMenu (só nas 3 abas de verdade) é o que aparece no menu lateral
// (admin-sidebar.jsx via admin-menu.constants.js) — é a MESMA lista, não
// uma 3ª cópia. As rotas de detalhe (Alterar/Consultar/Excluir/Criar/
// Minha Conta) NÃO têm rotuloMenu/grupoMenu de propósito — admin-menu.
// constants.js só lista item com grupoMenu preenchido, então elas nunca
// viram um botão clicável no menu, só ganham a moldura (sidebar visível,
// com a aba "pai" destacada sozinha pelo NavLink — a URL aninhada, ex.:
// /admin/usuarios/8/alterar, já COMEÇA com /admin/usuarios, então o
// próprio NavLink de "Usuários" já marca "ativo" sem código nenhum extra).
//
// `paiCaminho` (10-08-2026) — só nas rotas de detalhe: o `caminho`
// absoluto da listagem "dona" delas, pro breadcrumb montar a cadeia
// completa (Início > Usuários > Alterar Usuário), não só o último nível.
//
// grupoMenu (08-08-2026, pedido do Lucas: Dashboard fora do grupo
// CADASTROS, com divisória própria) diz a admin-menu.constants.js em qual
// grupo do menu lateral o item entra — `null` = fora de qualquer grupo
// (item solo, sem título de seção acima dele); ausente (undefined) = nem
// aparece no menu (rotas de detalhe).
export const ROTAS = [
  { caminho: '/login', elemento: LoginPage, rotuloBreadcrumb: 'Login' },
  { caminho: '/cadastro', elemento: CadastroPage, rotuloBreadcrumb: 'Criar conta' },
  {
    caminho: '/verificar-email',
    elemento: VerificarEmailPage,
    rotuloBreadcrumb: 'Verificar e-mail',
  },
];

export const ROTAS_ADMIN = [
  {
    caminho: '/admin/dashboard',
    caminhoRelativo: 'dashboard',
    elemento: Dashboard,
    rotuloMenu: 'Dashboard',
    // null: agora é a aba padrão (o que "/" redireciona pra ela) — mostrar
    // "Início > Dashboard" seria redundante com o próprio link "Início".
    rotuloBreadcrumb: null,
    grupoMenu: null,
    icone: 'fa-gauge',
  },
  {
    caminho: '/admin/usuarios',
    caminhoRelativo: 'usuarios',
    elemento: ListarUsuarios,
    rotuloMenu: 'Usuários',
    // ERA null (era a aba padrão) — o Dashboard assumiu esse posto acima.
    rotuloBreadcrumb: 'Usuários',
    grupoMenu: 'CADASTROS',
    icone: 'fa-users',
  },
  {
    caminho: '/admin/papeis',
    caminhoRelativo: 'papeis',
    elemento: ListarPapeis,
    rotuloMenu: 'Papéis & Permissões',
    rotuloBreadcrumb: 'Papéis & Permissões',
    grupoMenu: 'CADASTROS',
    icone: 'fa-user-shield',
  },
  {
    caminho: '/admin/configuracoes',
    caminhoRelativo: 'configuracoes',
    elemento: ListarConfiguracoes,
    rotuloMenu: 'Configurações',
    rotuloBreadcrumb: 'Configurações',
    grupoMenu: 'CADASTROS',
    icone: 'fa-sliders',
  },

  // Minha Conta (10-08-2026) — dentro do painel agora (sidebar visível),
  // mas sem rotuloMenu/grupoMenu: não é uma aba clicável do menu (o
  // acesso continua sendo pelo dropdown do cabeçalho), só ganha a
  // moldura. Sem paiCaminho — não é filha de nenhuma listagem, o
  // breadcrumb já fica correto como "Início > Minha Conta".
  { caminho: '/admin/minha-conta', caminhoRelativo: 'minha-conta', elemento: MinhaConta, rotuloBreadcrumb: 'Minha Conta' },

  // Usuário — filhas de /admin/usuarios (paiCaminho), mesmo padrão pras
  // outras 2 seções abaixo.
  {
    caminho: '/admin/usuarios/criar',
    caminhoRelativo: 'usuarios/criar',
    elemento: CriarUsuario,
    rotuloBreadcrumb: 'Criar Usuário',
    paiCaminho: '/admin/usuarios',
  },
  {
    caminho: '/admin/usuarios/:id/alterar',
    caminhoRelativo: 'usuarios/:id/alterar',
    elemento: AlterarUsuario,
    rotuloBreadcrumb: 'Alterar Usuário',
    paiCaminho: '/admin/usuarios',
  },
  {
    caminho: '/admin/usuarios/:id/consultar',
    caminhoRelativo: 'usuarios/:id/consultar',
    elemento: ConsultarUsuario,
    rotuloBreadcrumb: 'Consultar Usuário',
    paiCaminho: '/admin/usuarios',
  },
  {
    caminho: '/admin/usuarios/:id/excluir',
    caminhoRelativo: 'usuarios/:id/excluir',
    elemento: ExcluirUsuario,
    rotuloBreadcrumb: 'Excluir Usuário',
    paiCaminho: '/admin/usuarios',
  },

  // Papel — filha de /admin/papeis.
  {
    caminho: '/admin/papeis/:id/alterar',
    caminhoRelativo: 'papeis/:id/alterar',
    elemento: AlterarPapel,
    rotuloBreadcrumb: 'Alterar Papel',
    paiCaminho: '/admin/papeis',
  },

  // Configuração — filhas de /admin/configuracoes.
  {
    caminho: '/admin/configuracoes/criar',
    caminhoRelativo: 'configuracoes/criar',
    elemento: CriarConfiguracao,
    rotuloBreadcrumb: 'Criar Configuração',
    paiCaminho: '/admin/configuracoes',
  },
  {
    caminho: '/admin/configuracoes/:id/alterar',
    caminhoRelativo: 'configuracoes/:id/alterar',
    elemento: AlterarConfiguracao,
    rotuloBreadcrumb: 'Alterar Configuração',
    paiCaminho: '/admin/configuracoes',
  },
  {
    caminho: '/admin/configuracoes/:id/consultar',
    caminhoRelativo: 'configuracoes/:id/consultar',
    elemento: ConsultarConfiguracao,
    rotuloBreadcrumb: 'Consultar Configuração',
    paiCaminho: '/admin/configuracoes',
  },
  {
    caminho: '/admin/configuracoes/:id/excluir',
    caminhoRelativo: 'configuracoes/:id/excluir',
    elemento: ExcluirConfiguracao,
    rotuloBreadcrumb: 'Excluir Configuração',
    paiCaminho: '/admin/configuracoes',
  },
];
