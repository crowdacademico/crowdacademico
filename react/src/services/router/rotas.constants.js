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
import { CriarAreaConhecimento } from '../../views/8-area-conhecimento/criar-area-conhecimento';
import { AlterarAreaConhecimento } from '../../views/8-area-conhecimento/alterar-area-conhecimento';
import { ConsultarAreaConhecimento } from '../../views/8-area-conhecimento/consultar-area-conhecimento';
import { ListarAreasConhecimento } from '../../views/8-area-conhecimento/listar-areas-conhecimento';
import { CriarTipoLink } from '../../views/9-tipo-link/criar-tipo-link';
import { AlterarTipoLink } from '../../views/9-tipo-link/alterar-tipo-link';
import { ConsultarTipoLink } from '../../views/9-tipo-link/consultar-tipo-link';
import { ListarTiposLink } from '../../views/9-tipo-link/listar-tipos-link';

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
  // Configurações (11-08-2026, virou seu PRÓPRIO grupo — pedido do Lucas:
  // "ficaria esquisito" um item chamado Configurações dentro de um grupo
  // TAMBÉM chamado Configurações). O item em si virou "Parâmetros do
  // Sistema" (nome que descreve o que ele faz — a tabela `configuracoes`
  // guarda os limites/taxas/prazos que o resto do banco lê via
  // config_numero(), ver [[feedback_no_hardcoded_values]] — não é mais
  // "Configurações dentro de Configurações"). `caminho`/`caminhoRelativo`
  // continuam '/admin/configuracoes' de propósito — é só o RÓTULO visível
  // que muda, a URL/tabela/API por trás continuam "configuracoes", mesmo
  // espírito de `grupoMenu: 'CADASTROS'` nunca ter mudado de nome quando
  // o TÍTULO do grupo mudou de "CADASTROS" pra "GESTÃO DE ACESSO E
  // SISTEMA" (ver admin-menu.constants.js).
  {
    caminho: '/admin/configuracoes',
    caminhoRelativo: 'configuracoes',
    elemento: ListarConfiguracoes,
    rotuloMenu: 'Parâmetros do Sistema',
    rotuloBreadcrumb: 'Parâmetros do Sistema',
    grupoMenu: 'CONFIGURACOES',
    icone: 'fa-sliders',
  },

  // Área de Conhecimento (módulo 8-area-conhecimento) — ativada no menu
  // lateral em 11-08-2026 (antes só existia por URL direta, sem
  // `grupoMenu`, esperando o Lucas decidir onde entrar — ver histórico
  // git). Entrou no mesmo grupo de Usuários/Papéis (grupoMenu:
  // 'CADASTROS', hoje rotulado "GESTÃO DO USUÁRIO").
  {
    caminho: '/admin/areas-conhecimento',
    caminhoRelativo: 'areas-conhecimento',
    elemento: ListarAreasConhecimento,
    rotuloMenu: 'Áreas do Conhecimento',
    rotuloBreadcrumb: 'Áreas do Conhecimento',
    grupoMenu: 'CADASTROS',
    icone: 'fa-diagram-project',
  },

  // Tipo de Link (módulo 9-tipo-link) — mesma ativação de Área de
  // Conhecimento logo acima, mesmo grupo.
  {
    caminho: '/admin/tipos-link',
    caminhoRelativo: 'tipos-link',
    elemento: ListarTiposLink,
    rotuloMenu: 'Tipos de Link',
    rotuloBreadcrumb: 'Tipos de Link',
    grupoMenu: 'CADASTROS',
    icone: 'fa-link',
  },

  // Minha Conta (10-08-2026) — dentro do painel agora (sidebar visível),
  // mas sem rotuloMenu/grupoMenu: não é uma aba clicável do menu (o
  // acesso continua sendo pelo dropdown do cabeçalho), só ganha a
  // moldura. Sem paiCaminho — não é filha de nenhuma listagem, o
  // breadcrumb já fica correto como "Início > Minha Conta".
  //
  // `:aba` (11-08-2026, virou abas de verdade — Perfil/Segurança/Papéis/
  // Acadêmico/Privacidade) — UMA rota parametrizada, não 5 entradas
  // repetidas: MinhaConta lê `aba` via useParams() e decide o que
  // renderizar por baixo da faixa de identidade (que não muda entre
  // abas). Mesmo padrão de parâmetro já usado em
  // '/admin/usuarios/:id/alterar' aqui embaixo. O caminho SEM `/:aba`
  // (ex.: link antigo direto pra "/admin/minha-conta") ganha um redirect
  // pra ".../perfil" em App.jsx — não precisa de uma 2ª entrada aqui.
  {
    caminho: '/admin/minha-conta/:aba',
    caminhoRelativo: 'minha-conta/:aba',
    elemento: MinhaConta,
    rotuloBreadcrumb: 'Minha Conta',
  },

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

  // Parâmetro do Sistema (nome novo) — filhas de /admin/configuracoes
  // (caminho da URL não mudou, só o rótulo, ver comentário lá em cima).
  {
    caminho: '/admin/configuracoes/criar',
    caminhoRelativo: 'configuracoes/criar',
    elemento: CriarConfiguracao,
    rotuloBreadcrumb: 'Criar Parâmetro',
    paiCaminho: '/admin/configuracoes',
  },
  {
    caminho: '/admin/configuracoes/:id/alterar',
    caminhoRelativo: 'configuracoes/:id/alterar',
    elemento: AlterarConfiguracao,
    rotuloBreadcrumb: 'Alterar Parâmetro',
    paiCaminho: '/admin/configuracoes',
  },
  {
    caminho: '/admin/configuracoes/:id/consultar',
    caminhoRelativo: 'configuracoes/:id/consultar',
    elemento: ConsultarConfiguracao,
    rotuloBreadcrumb: 'Consultar Parâmetro',
    paiCaminho: '/admin/configuracoes',
  },
  {
    caminho: '/admin/configuracoes/:id/excluir',
    caminhoRelativo: 'configuracoes/:id/excluir',
    elemento: ExcluirConfiguracao,
    rotuloBreadcrumb: 'Excluir Parâmetro',
    paiCaminho: '/admin/configuracoes',
  },

  // Área de Conhecimento — filhas de /admin/areas-conhecimento. Sem rota
  // de excluir: backend não tem DELETE pra area_conhecimento (só
  // INSERT/UPDATE concedidos em 06_grants.sql), só desativa via Alterar.
  {
    caminho: '/admin/areas-conhecimento/criar',
    caminhoRelativo: 'areas-conhecimento/criar',
    elemento: CriarAreaConhecimento,
    rotuloBreadcrumb: 'Criar Área de Conhecimento',
    paiCaminho: '/admin/areas-conhecimento',
  },
  {
    caminho: '/admin/areas-conhecimento/:id/alterar',
    caminhoRelativo: 'areas-conhecimento/:id/alterar',
    elemento: AlterarAreaConhecimento,
    rotuloBreadcrumb: 'Alterar Área de Conhecimento',
    paiCaminho: '/admin/areas-conhecimento',
  },
  {
    caminho: '/admin/areas-conhecimento/:id/consultar',
    caminhoRelativo: 'areas-conhecimento/:id/consultar',
    elemento: ConsultarAreaConhecimento,
    rotuloBreadcrumb: 'Consultar Área de Conhecimento',
    paiCaminho: '/admin/areas-conhecimento',
  },

  // Tipo de Link — filhas de /admin/tipos-link. Sem rota de excluir:
  // backend não tem DELETE pra tipo_link (só INSERT/UPDATE concedidos em
  // 06_grants.sql [06-C-2]), só desativa via Alterar.
  {
    caminho: '/admin/tipos-link/criar',
    caminhoRelativo: 'tipos-link/criar',
    elemento: CriarTipoLink,
    rotuloBreadcrumb: 'Criar Tipo de Link',
    paiCaminho: '/admin/tipos-link',
  },
  {
    caminho: '/admin/tipos-link/:id/alterar',
    caminhoRelativo: 'tipos-link/:id/alterar',
    elemento: AlterarTipoLink,
    rotuloBreadcrumb: 'Alterar Tipo de Link',
    paiCaminho: '/admin/tipos-link',
  },
  {
    caminho: '/admin/tipos-link/:id/consultar',
    caminhoRelativo: 'tipos-link/:id/consultar',
    elemento: ConsultarTipoLink,
    rotuloBreadcrumb: 'Consultar Tipo de Link',
    paiCaminho: '/admin/tipos-link',
  },
];
