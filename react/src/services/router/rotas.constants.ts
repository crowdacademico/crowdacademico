import type { ComponentType } from 'react';
import type { PropsPagina } from './pagina.type';
import { LoginPage } from '../../views/3-auth/login-page';
import { CadastroPage } from '../../views/3-auth/cadastro-page';
import { VerificarEmailPage } from '../../views/3-auth/verificar-email-page';
import { MinhaConta } from '../../views/3-auth/minha-conta-page';
import { Dashboard } from '../../views/admin/dashboard';
import { ListarUsuarios } from '../../views/1-usuario/listar-usuarios';
import { ListarPapeis } from '../../views/2-papel-permissao/listar-papeis';
import { ListarConfiguracoes } from '../../views/11-configuracoes/listar-configuracoes';
import { ListarAreasConhecimento } from '../../views/8-area-conhecimento/listar-areas-conhecimento';
import { ListarTiposLink } from '../../views/9-tipo-link/listar-tipos-link';
import { ListarMotivosDenuncia } from '../../views/10-motivo-denuncia/listar-motivos-denuncia';
import { ListarPesquisadores } from '../../views/6-perfil-pesquisador/listar-pesquisadores';
import { ListarCampanhas } from '../../views/12-campanha/listar-campanhas';
import { BancadaPesquisador } from '../../views/campo-testes/bancada-pesquisador';
import { BancadaCampanha } from '../../views/campo-testes/bancada-campanha';
import { VidaCampanhaAtiva } from '../../views/campo-testes/vida-campanha-ativa';
import { ListarTermosUso } from '../../views/5-termo-uso/listar-termos-uso';
import { CriarTermoUso } from '../../views/5-termo-uso/criar-termo-uso';

// Fonte única de verdade pra "quais páginas existem" - App.tsx monta as
// <Route> a partir daqui, e breadcrumb.tsx monta o rótulo a partir daqui.
// rotuloBreadcrumb: null = não aparece no breadcrumb.
//
// Duas listas, não uma, porque descrevem coisas diferentes: ROTAS são
// páginas PÚBLICAS/pré-login (Header/Breadcrumb/Footer, sem sidebar) -
// login, cadastro, verificar e-mail. ROTAS_ADMIN é TUDO que precisa do
// menu lateral (10-08-2026, pedido do Lucas: "não tem pq o menu lateral
// sumir" em Alterar/Consultar/Excluir/Minha Conta - antes essas telas
// viviam em ROTAS, por isso perdiam o menu E o breadcrumb não sabia de
// qual listagem elas vieram). Renderizadas dentro do <Outlet/> de
// views/admin/admin-layout.tsx (sidebar + área de conteúdo compartilhadas).
//
// rotuloMenu (só nas 3 abas de verdade) é o que aparece no menu lateral
// (admin-sidebar.tsx via admin-menu.constants.js) - é a MESMA lista, não
// uma 3ª cópia. As rotas de detalhe (Alterar/Consultar/Excluir/Criar/
// Minha Conta) NÃO têm rotuloMenu/grupoMenu de propósito - admin-menu.
// constants.js só lista item com grupoMenu preenchido, então elas nunca
// viram um botão clicável no menu, só ganham a moldura (sidebar visível,
// com a aba "pai" destacada sozinha pelo NavLink - a URL aninhada, ex.:
// /admin/papeis/8/alterar, já COMEÇA com /admin/papeis, então o próprio
// NavLink de "Papéis" já marca "ativo" sem código nenhum extra).
//
// `paiCaminho` (10-08-2026) - só nas rotas de detalhe: o `caminho`
// absoluto da listagem "dona" delas, pro breadcrumb montar a cadeia
// completa (Início > Usuários > Alterar Usuário), não só o último nível.
//
// grupoMenu (08-08-2026, pedido do Lucas: Dashboard fora do grupo
// CADASTROS, com divisória própria) diz a admin-menu.constants.js em qual
// grupo do menu lateral o item entra - `null` = fora de qualquer grupo
// (item solo, sem título de seção acima dele); ausente (undefined) = nem
// aparece no menu (rotas de detalhe).
export interface Rota {
  caminho: string;
  caminhoRelativo?: string;
  // Todas as páginas recebem a MESMA prop (App.tsx: `<Elemento auth={auth} />`
  // em toda rota, sem exceção) - `PropsPagina`, não `any`. Cada view (Fase
  // 6, concluída) já anota `{ auth }: PropsPagina`, então o array abaixo
  // converge de verdade pro mesmo tipo, sem supressão nenhuma.
  elemento: ComponentType<PropsPagina>;
  rotuloMenu?: string;
  rotuloBreadcrumb: string | null;
  grupoMenu?: string | null;
  icone?: string;
  paiCaminho?: string;
}

export const ROTAS: Rota[] = [
  { caminho: '/login', elemento: LoginPage, rotuloBreadcrumb: 'Login' },
  { caminho: '/cadastro', elemento: CadastroPage, rotuloBreadcrumb: 'Criar conta' },
  {
    caminho: '/verificar-email',
    elemento: VerificarEmailPage,
    rotuloBreadcrumb: 'Verificar e-mail',
  },
];

export const ROTAS_ADMIN: Rota[] = [
  {
    caminho: '/admin/dashboard',
    caminhoRelativo: 'dashboard',
    elemento: Dashboard,
    rotuloMenu: 'Dashboard',
    // null: agora é a aba padrão (o que "/" redireciona pra ela) - mostrar
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
    // ERA null (era a aba padrão) - o Dashboard assumiu esse posto acima.
    rotuloBreadcrumb: 'Usuários',
    grupoMenu: 'CADASTROS',
    icone: 'fa-users',
  },

  // Pesquisadores (módulo 6-perfil-pesquisador) - ativada no menu lateral
  // em 23-08-2026 (achado igual ao de Motivos de Denúncia: o módulo
  // inteiro - criar, consultar, score - já estava pronto e testado desde
  // 22-08-2026, mas sem NENHUMA entrada de menu; "algum outro que eu
  // esqueci?"). Logo depois de Usuários - um pesquisador é um usuário com
  // um perfil a mais, não uma entidade separada.
  {
    caminho: '/admin/pesquisadores',
    caminhoRelativo: 'pesquisadores',
    elemento: ListarPesquisadores,
    rotuloMenu: 'Pesquisadores',
    rotuloBreadcrumb: 'Pesquisadores',
    grupoMenu: 'CADASTROS',
    icone: 'fa-flask',
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
  // Configurações (11-08-2026, virou seu PRÓPRIO grupo - pedido do Lucas:
  // "ficaria esquisito" um item chamado Configurações dentro de um grupo
  // TAMBÉM chamado Configurações). O item em si virou "Parâmetros do
  // Sistema" (nome que descreve o que ele faz - a tabela `configuracoes`
  // guarda os limites/taxas/prazos que o resto do banco lê via
  // config_numero(), ver [[feedback_no_hardcoded_values]] - não é mais
  // "Configurações dentro de Configurações"). `caminho`/`caminhoRelativo`
  // continuam '/admin/configuracoes' de propósito - é só o RÓTULO visível
  // que muda, a URL/tabela/API por trás continuam "configuracoes", mesmo
  // espírito de `grupoMenu: 'CADASTROS'` nunca ter mudado de nome quando
  // o TÍTULO do grupo mudou de "CADASTROS" pra "GESTÃO DE ACESSO E
  // SISTEMA" (ver admin-menu.constants.js).
  // Termos de Uso (módulo 5-termo-uso) - ativado no menu lateral em
  // 13-09-2026, pedido do Lucas: "vamos acabar Termos de Uso por
  // completo". Mesmo grupo de Parâmetros do Sistema (CONFIGURACOES) - é
  // configuração/documento do sistema, não caso individual de moderação
  // (não é MODERACAO) nem cadastro sobre "quem é o usuário" (não é
  // CADASTROS). Entra ACIMA de Parâmetros do Sistema de propósito (pedido
  // do Lucas) - `itensDoGrupo` (admin-menu.constants.js) preserva a ORDEM
  // deste array, então a posição aqui embaixo decide a posição no menu.
  {
    caminho: '/admin/termos-uso',
    caminhoRelativo: 'termos-uso',
    elemento: ListarTermosUso,
    rotuloMenu: 'Termos de Uso',
    rotuloBreadcrumb: 'Termos de Uso',
    grupoMenu: 'CONFIGURACOES',
    icone: 'fa-file-contract',
  },

  {
    caminho: '/admin/configuracoes',
    caminhoRelativo: 'configuracoes',
    elemento: ListarConfiguracoes,
    rotuloMenu: 'Parâmetros do Sistema',
    rotuloBreadcrumb: 'Parâmetros do Sistema',
    grupoMenu: 'CONFIGURACOES',
    icone: 'fa-sliders',
  },

  // Área de Conhecimento (módulo 8-area-conhecimento) - ativada no menu
  // lateral em 11-08-2026 (antes só existia por URL direta, sem
  // `grupoMenu`, esperando o Lucas decidir onde entrar - ver histórico
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

  // Tipo de Link (módulo 9-tipo-link) - mesma ativação de Área de
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
  // Motivo de Denúncia (módulo 10-motivo-denuncia) - ativada no menu
  // lateral em 22-08-2026 (achado numa auditoria: a rota e a página já
  // funcionavam por URL direta desde que a Alexia terminou o módulo, mas
  // sem `rotuloMenu`/`grupoMenu` não tinha entrada nenhuma no menu lateral
  // - ninguém achava navegando). MOVIDA (mesmo dia, pedido do Lucas) de
  // 'CADASTROS' (GESTÃO DO USUÁRIO) pra 'MODERACAO' - faz mais sentido
  // conceitual junto de Aprovar Campanhas/Denúncias/Solicitações/Enc.
  // Antecipados (ainda placeholders desabilitados, ver
  // admin-menu.constants.js) do que junto de Área de Conhecimento/Tipo de
  // Link. Entra no TOPO do grupo MODERAÇÃO - é o único item real ali por
  // enquanto, os outros 4 seguem desabilitados.
  {
    caminho: '/admin/motivos-denuncia',
    caminhoRelativo: 'motivos-denuncia',
    elemento: ListarMotivosDenuncia,
    rotuloMenu: 'Motivos de Denúncia',
    rotuloBreadcrumb: 'Motivos de Denúncia',
    grupoMenu: 'MODERACAO',
    icone: 'fa-flag',
  },

  // Campanhas (módulo 12-campanha) - ativada no menu lateral em
  // 23-08-2026, pedido do Lucas ("tipo o Menu de Usuários"). Grupo
  // próprio ('CAMPANHA', ver admin-menu.constants.js) - não cabia em
  // GESTÃO DO USUÁRIO (não é sobre gerenciar quem é o usuário) nem em
  // MODERAÇÃO (aquele grupo é especificamente sobre a FILA de aprovação/
  // denúncia, ainda não construída - isto aqui é só "ver as campanhas que
  // existem", mais parecido com a listagem de Usuários). Posicionado
  // antes de MODERAÇÃO: faz sentido navegar "ver campanhas" antes de
  // "moderar campanhas".
  {
    caminho: '/admin/campanhas',
    caminhoRelativo: 'campanhas',
    elemento: ListarCampanhas,
    rotuloMenu: 'Campanhas',
    rotuloBreadcrumb: 'Campanhas',
    grupoMenu: 'CAMPANHA',
    icone: 'fa-bullhorn',
  },

  // Minha Conta (10-08-2026) - dentro do painel agora (sidebar visível),
  // mas sem rotuloMenu/grupoMenu: não é uma aba clicável do menu (o
  // acesso continua sendo pelo dropdown do cabeçalho), só ganha a
  // moldura. Sem paiCaminho - não é filha de nenhuma listagem, o
  // breadcrumb já fica correto como "Início > Minha Conta".
  //
  // `:aba` (11-08-2026, virou abas de verdade - Perfil/Segurança/Papéis/
  // Acadêmico/Privacidade) - UMA rota parametrizada, não 5 entradas
  // repetidas: MinhaConta lê `aba` via useParams() e decide o que
  // renderizar por baixo da faixa de identidade (que não muda entre
  // abas). CORRIGIDO (14-09-2026): este comentário citava
  // '/admin/papeis/:id/alterar' como outro exemplo de rota com parâmetro -
  // essa rota (e toda rota com `:id` que existia em ROTAS_ADMIN) migrou
  // pra modal na mesma data (ver os comentários "migrou pra modal" mais
  // abaixo). `:aba`, aqui, é hoje o ÚNICO parâmetro de rota que sobra no
  // painel admin inteiro. O caminho SEM `/:aba`
  // (ex.: link antigo direto pra "/admin/minha-conta") ganha um redirect
  // pra ".../perfil" em App.tsx - não precisa de uma 2ª entrada aqui.
  {
    caminho: '/admin/minha-conta/:aba',
    caminhoRelativo: 'minha-conta/:aba',
    elemento: MinhaConta,
    rotuloBreadcrumb: 'Minha Conta',
  },

  // Usuário - EM MODAL (13-09-2026, pedido do Lucas: "apagar as telas do
  // CRUD de Usuário, fazer a completa migração do Modal") - Criar/Alterar/
  // Consultar/Excluir deixaram de ser rotas próprias; viraram os modais
  // abertos direto por listar-usuarios.tsx (ver modal-usuario.tsx/
  // modal-criar-usuario.tsx), mesmos componentes reaproveitados pela
  // Bancada do Pesquisador (Campo de Testes).

  // Papel - Alterar migrou pra modal (14-09-2026, ver listar-papeis.tsx) -
  // sem rota própria, mesmo motivo dos outros catálogos.

  // Termos de Uso - filhas de /admin/termos-uso. Consultar é modal (ver
  // listar-termos-uso.tsx), sem Excluir de propósito (nenhuma versão pode
  // desaparecer - rastro de auditoria).
  {
    caminho: '/admin/termos-uso/criar',
    caminhoRelativo: 'termos-uso/criar',
    elemento: CriarTermoUso,
    rotuloBreadcrumb: 'Publicar Termos de Uso',
    paiCaminho: '/admin/termos-uso',
  },
  // Alterar (13-09-2026, decisão do Lucas via AskUserQuestion: "editar só
  // enquanto ninguém aceitou ainda") EM MODAL desde o mesmo dia, rodada
  // seguinte (pedido do Lucas: "adotar modal para o CRUD") - a página
  // própria que existia aqui foi apagada; ModalAlterarTermoUso é aberto
  // direto por listar-termos-uso.tsx/dashboard-regras-negocio.tsx, sem
  // rota própria (mesmo padrão de Usuário).

  // Parâmetro do Sistema - Criar/Alterar/Consultar/Excluir migraram pra
  // modal (14-09-2026, ver listar-configuracoes.tsx) - sem rota própria,
  // mesmo motivo de Usuário/Motivo de Denúncia/Termos de Uso.

  // Área de Conhecimento - Criar/Alterar/Consultar/Excluir migraram pra
  // modal (14-09-2026, ver listar-areas-conhecimento.tsx) - sem rota
  // própria, mesmo motivo dos outros catálogos.

  // Tipo de Link - Criar/Alterar/Consultar/Excluir migraram pra modal
  // (14-09-2026, ver listar-tipos-link.tsx) - sem rota própria, mesmo
  // motivo dos outros catálogos.

  // Motivo de Denúncia - Criar/Alterar/Consultar/Excluir migraram pra
  // modal (14-09-2026, ver listar-motivos-denuncia.tsx) - sem rota
  // própria, mesmo motivo de Usuário/Pesquisador/Termos de Uso.

  // Campanhas - Consultar migrou pra modal (14-09-2026, ver
  // listar-campanhas.tsx) - sem rota própria (sem Alterar/Excluir por
  // enquanto, ver comentário da listagem).

  // Pesquisadores - Consultar EM MODAL desde 13-09-2026 (pedido do Lucas:
  // "não duplicar código, é exatamente igual ao do Usuário") - a rota
  // própria (`consultar-pesquisador.tsx`) foi apagada; listar-pesquisadores.tsx
  // agora abre o mesmo ModalConsultarUsuario direto, sem navegar daqui.

  // ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES. NÃO ESTÁ NOS
  // REQUISITOS FUNCIONAIS E NEM ESTARÁ. - vale só pro trecho abaixo, não
  // pro arquivo inteiro (rotas.constants.js é a fonte única de verdade de
  // TODAS as rotas, não só as do Campo de Testes).
  //
  // `import.meta.env.DEV` (22-08-2026, pedido explícito da revisão do
  // uma IA sobre o Campo de Testes): em build de produção, este array
  // fica vazio - a rota nem existe, o grupo some do menu (admin-menu.
  // constants.js só mostra o que `itensDoGrupo` acha aqui). O Elenco
  // guarda refresh token de várias contas reais ao mesmo tempo; em
  // desenvolvimento é ferramenta, em produção seria uma porta escancarada.
  ...(import.meta.env.DEV
    ? [
        {
          caminho: '/admin/campo-testes/pesquisador',
          caminhoRelativo: 'campo-testes/pesquisador',
          elemento: BancadaPesquisador,
          // "T1" (23-08-2026, renumerado - pedido do Lucas: "o primeiro
          // não deveria ser T1?" - sim, a numeração antiga vinha de uma
          // tela T1/Elenco já apagada; sem ela, o mais correto é começar
          // do 1 de novo, não deixar um buraco por causa de história
          // passada que ninguém mais vê).
          rotuloMenu: 'T1 - Bancada do Pesquisador',
          rotuloBreadcrumb: 'T1 - Bancada do Pesquisador',
          grupoMenu: 'CAMPO_TESTES',
          icone: 'fa-flask',
        },
        {
          caminho: '/admin/campo-testes/campanha',
          caminhoRelativo: 'campo-testes/campanha',
          elemento: BancadaCampanha,
          rotuloMenu: 'T2 - Bancada da Campanha',
          rotuloBreadcrumb: 'T2 - Bancada da Campanha',
          grupoMenu: 'CAMPO_TESTES',
          icone: 'fa-bullhorn',
        },
        {
          caminho: '/admin/campo-testes/vida-campanha',
          caminhoRelativo: 'campo-testes/vida-campanha',
          elemento: VidaCampanhaAtiva,
          rotuloMenu: 'T3 - Vida da Campanha Ativa',
          rotuloBreadcrumb: 'T3 - Vida da Campanha Ativa',
          grupoMenu: 'CAMPO_TESTES',
          icone: 'fa-comments',
        },
      ]
    : []),
];
