import type { ComponentType } from 'react';
import type { PropsPagina } from './pagina.type';
import { LoginPage } from '../../views/3-auth/login-page';
import { CadastroPage } from '../../views/3-auth/cadastro-page';
import { VerificarEmailPage } from '../../views/3-auth/verificar-email-page';
import { EsqueciSenhaPage } from '../../views/3-auth/esqueci-senha-page';
import { RedefinirSenhaPage } from '../../views/3-auth/redefinir-senha-page';
import { Dashboard } from '../../views/29-dashboard/dashboard';
import { ListarUsuarios } from '../../views/1-usuario/listar-usuarios';
import { ListarPapeis } from '../../views/2-papel-permissao/listar-papeis';
import { ListarConfiguracoes } from '../../views/11-configuracoes/listar-configuracoes';
import { ListarAreasConhecimento } from '../../views/8-area-conhecimento/listar-areas-conhecimento';
import { ListarTiposLink } from '../../views/9-tipo-link/listar-tipos-link';
import { ListarMotivosDenuncia } from '../../views/10-motivo-denuncia/listar-motivos-denuncia';
import { ListarPesquisadores } from '../../views/6-perfil-pesquisador/listar-pesquisadores';
import { ListarCampanhas } from '../../views/12-campanha/listar-campanhas';
import { AprovarCampanhas } from '../../views/12-campanha/aprovar-campanhas';
import { ListarDenuncias } from '../../views/19-denuncia/listar-denuncias';
import { ListarEncerramentos } from '../../views/20-solicitacao-encerramento/listar-encerramentos';
import { ListarRevisoesPagamento } from '../../views/25-pagamento-revisao/listar-revisoes-pagamento';
import { ListarReembolsosManuais } from '../../views/25-pagamento-revisao/listar-reembolsos-manuais';
import { ListarRepassesAtencao } from '../../views/25-pagamento-revisao/listar-repasses-atencao';
import { ListarAuditoriaFinanceira } from '../../views/25-pagamento-revisao/listar-auditoria-financeira';
import { ListarContribuicoes } from '../../views/25-pagamento-revisao/listar-contribuicoes';
import { ListarRepasses } from '../../views/25-pagamento-revisao/listar-repasses';
import { ListarAtualizacoes } from '../../views/15-atualizacao-campanha/listar-atualizacoes';
import { ListarTermosUso } from '../../views/5-termo-uso/listar-termos-uso';
import { PontuacaoScore } from '../../views/11-configuracoes/pontuacao-score';
import { ListarModelosMensagem } from '../../views/27-notificacao/listar-modelos-mensagem';
import { ListarNotificacoes } from '../../views/27-notificacao/listar-notificacoes';
import { campoTestes } from './campo-testes-opcional';
import { ComoFunciona } from '../../views/publico/como-funciona';
import { Sobre } from '../../views/publico/sobre';
import { TermosUso } from '../../views/publico/termos-uso';
import { AtualizacoesCampanha } from '../../views/publico/atualizacoes-campanha';
import { RedirecionarAreaConta } from '../../views/publico/redirecionar-area-conta';
import { PerfilPesquisador } from '../../views/publico/perfil-pesquisador';
import { Home } from '../../views/publico/home';
import { Explorar } from '../../views/publico/explorar';
import { Campanha } from '../../views/publico/campanha';
import { Checkout } from '../../views/publico/checkout';
import { ApoioConfirmado } from '../../views/publico/apoio-confirmado';
import { Notificacoes } from '../../views/publico/notificacoes';
import { CriarCampanhaPage } from '../../views/publico/criar-campanha-page';
import { EstudioPesquisador } from '../../views/publico/estudio-pesquisador';
import { MinhaConta } from '../../views/3-auth/minha-conta-page';

// Fonte única de verdade para "quais páginas existem": App.tsx monta as <Route> daqui e breadcrumb.tsx monta
// o rótulo daqui. rotuloBreadcrumb: null = não aparece no breadcrumb.
//
// ROTAS são páginas públicas (Header/Breadcrumb/Footer, sem sidebar), incluindo conteúdo institucional e
// autenticação. ROTAS_CONTA são páginas autenticadas fora do painel administrativo. ROTAS_ADMIN é TUDO que
// precisa do menu lateral, renderizado dentro do <Outlet/> de components/layout/painel-admin/admin-layout.tsx
// (sidebar + área de conteúdo compartilhadas).
//
// rotuloMenu é o que aparece no menu lateral (admin-sidebar.tsx via admin-menu.constants): é a MESMA lista, não
// uma 3ª cópia. Rotas sem rotuloMenu/grupoMenu (ex.: Minha Conta) nunca viram botão do menu, só ganham a
// moldura (sidebar visível, com a aba "pai" destacada sozinha pelo NavLink quando a URL começa com o caminho
// dela).
//
// `paiCaminho`: só nas rotas de detalhe: o `caminho` absoluto da listagem "dona" delas, para o breadcrumb montar
// a cadeia completa (Início > Termo de Uso > Publicar Termo de Uso), não só o último nível.
//
// grupoMenu diz a admin-menu.constants em qual grupo do menu lateral o item entra: `null` = fora de qualquer
// grupo (item solo, sem título de seção acima dele); ausente (undefined) = nem aparece no menu (rotas de
// detalhe).
export interface Rota {
  caminho: string;
  caminhoRelativo?: string;
  // Todas as páginas recebem a MESMA prop (App.tsx: `<Elemento auth={auth} />` em toda rota, sem exceção):
  // `PropsPagina`, não `any`; cada view anota `{ auth }: PropsPagina`.
  elemento: ComponentType<PropsPagina>;
  rotuloMenu?: string;
  rotuloBreadcrumb: string | null;
  grupoMenu?: string | null;
  icone?: string;
  paiCaminho?: string;
}

export const ROTAS: Rota[] = [
  { caminho: '/', elemento: Home, rotuloBreadcrumb: null },
  { caminho: '/explorar', elemento: Explorar, rotuloBreadcrumb: 'Explorar projetos' },
  { caminho: '/campanha/:id', elemento: Campanha, rotuloBreadcrumb: 'Campanha' },
  { caminho: '/checkout', elemento: Checkout, rotuloBreadcrumb: 'Apoiar campanha' },
  { caminho: '/apoiar', elemento: Checkout, rotuloBreadcrumb: 'Apoiar campanha' },
  { caminho: '/apoio-confirmado', elemento: ApoioConfirmado, rotuloBreadcrumb: 'Confirmação do apoio' },
  { caminho: '/como-funciona', elemento: ComoFunciona, rotuloBreadcrumb: 'Como funciona' },
  { caminho: '/sobre', elemento: Sobre, rotuloBreadcrumb: 'Sobre' },
  { caminho: '/termos', elemento: TermosUso, rotuloBreadcrumb: 'Termo de Uso' },
  { caminho: '/pesquisador/:idUsuario', elemento: PerfilPesquisador, rotuloBreadcrumb: 'Pesquisador' },
  { caminho: '/campanha/:id/atualizacoes', elemento: AtualizacoesCampanha, rotuloBreadcrumb: 'Atualizações' },
  { caminho: '/minha-conta', elemento: RedirecionarAreaConta, rotuloBreadcrumb: null },
  { caminho: '/criar-campanha', elemento: CriarCampanhaPage, rotuloBreadcrumb: null },
  { caminho: '/minhas-campanhas', elemento: EstudioPesquisador, rotuloBreadcrumb: 'Estúdio do pesquisador' },
  { caminho: '/estudio-pesquisador', elemento: EstudioPesquisador, rotuloBreadcrumb: 'Estúdio do pesquisador' },
  { caminho: '/minhas-contribuicoes', elemento: RedirecionarAreaConta, rotuloBreadcrumb: null },
  { caminho: '/painel-doador', elemento: RedirecionarAreaConta, rotuloBreadcrumb: null },
  { caminho: '/painel-pesquisador', elemento: RedirecionarAreaConta, rotuloBreadcrumb: null },
  { caminho: '/notificacoes', elemento: Notificacoes, rotuloBreadcrumb: 'Notificações' },
  { caminho: '/login', elemento: LoginPage, rotuloBreadcrumb: 'Login' },
  { caminho: '/cadastro', elemento: CadastroPage, rotuloBreadcrumb: 'Criar conta' },
  {
    caminho: '/verificar-email',
    elemento: VerificarEmailPage,
    rotuloBreadcrumb: 'Verificar e-mail',
  },
  { caminho: '/esqueci-senha', elemento: EsqueciSenhaPage, rotuloBreadcrumb: 'Esqueci minha senha' },
  { caminho: '/redefinir-senha', elemento: RedefinirSenhaPage, rotuloBreadcrumb: 'Criar nova senha' },
];

export const ROTAS_CONTA: Rota[] = [
  { caminho: '/minha-conta/:aba', elemento: MinhaConta, rotuloBreadcrumb: 'Minha Conta' },
];

export const ROTAS_ADMIN: Rota[] = [
  {
    caminho: '/admin/dashboard',
    caminhoRelativo: 'dashboard',
    elemento: Dashboard,
    rotuloMenu: 'Dashboard',
    // null: é a aba padrão (o que "/" redireciona): mostrar "Início > Dashboard" seria redundante com o
    // próprio link "Início".
    rotuloBreadcrumb: null,
    grupoMenu: null,
    icone: 'fa-gauge',
  },
  {
    caminho: '/admin/usuarios',
    caminhoRelativo: 'usuarios',
    elemento: ListarUsuarios,
    rotuloMenu: 'Usuários',
    rotuloBreadcrumb: 'Usuários',
    grupoMenu: 'CADASTROS',
    icone: 'fa-users',
  },

  // Pesquisadores (módulo 6-perfil-pesquisador): logo depois de Usuários: um pesquisador é um usuário com um
  // perfil a mais, não uma entidade separada.
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
  // Termo de Uso (módulo 5-termo-uso): mesmo grupo de Parâmetros do Sistema (CONFIGURACOES): é
  // configuração/documento do sistema, não caso individual de moderação nem cadastro sobre "quem é o usuário".
  // Fica ACIMA de Parâmetros do Sistema de propósito: `itensDoGrupo` (admin-menu.constants) preserva a ORDEM
  // deste array, então a posição aqui decide a posição no menu.
  {
    caminho: '/admin/termos-uso',
    caminhoRelativo: 'termos-uso',
    elemento: ListarTermosUso,
    rotuloMenu: 'Termo de Uso',
    rotuloBreadcrumb: 'Termo de Uso',
    grupoMenu: 'CONFIGURACOES',
    icone: 'fa-file-contract',
  },

  // Parâmetros do Sistema: grupo próprio (CONFIGURACOES): um item chamado Configurações dentro de um grupo
  // também chamado Configurações ficaria esquisito. O rótulo descreve o que a tabela `configuracoes` guarda
  // (limites, taxas e prazos que o banco lê via config_numero()). A URL segue o nome da tela, como as outras
  // ('/admin/parametros-sistema'); a tabela, a API e os arquivos continuam "configuracoes". O endereço antigo
  // redireciona (App.tsx).
  {
    caminho: '/admin/parametros-sistema',
    caminhoRelativo: 'parametros-sistema',
    elemento: ListarConfiguracoes,
    rotuloMenu: 'Parâmetros do Sistema',
    rotuloBreadcrumb: 'Parâmetros do Sistema',
    grupoMenu: 'CONFIGURACOES',
    icone: 'fa-sliders',
  },
  // Pontuação (Score): pesos das dimensões e faixas de reputação (tabelas score_config e score_rotulo).
  {
    caminho: '/admin/pontuacao',
    caminhoRelativo: 'pontuacao',
    elemento: PontuacaoScore,
    rotuloMenu: 'Pontuação (Score)',
    rotuloBreadcrumb: 'Pontuação (Score)',
    grupoMenu: 'CONFIGURACOES',
    icone: 'fa-star-half-stroke',
  },
  // Notificações: o que o sistema mandou e para quem, por e-mail e pelo sino (tabela notificacao).
  {
    caminho: '/admin/notificacoes',
    caminhoRelativo: 'notificacoes',
    elemento: ListarNotificacoes,
    rotuloMenu: 'Notificações',
    rotuloBreadcrumb: 'Notificações',
    grupoMenu: 'COMUNICACOES',
    icone: 'fa-paper-plane',
  },
  // Mensagens: o texto de cada aviso (e-mail e sino), por evento e canal (tabela modelo_mensagem).
  {
    caminho: '/admin/mensagens',
    caminhoRelativo: 'mensagens',
    elemento: ListarModelosMensagem,
    rotuloMenu: 'Mensagens',
    rotuloBreadcrumb: 'Mensagens',
    grupoMenu: 'CONFIGURACOES',
    icone: 'fa-envelope-open-text',
  },

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
  {
    caminho: '/admin/motivos-denuncia',
    caminhoRelativo: 'motivos-denuncia',
    elemento: ListarMotivosDenuncia,
    rotuloMenu: 'Motivos de Denúncia',
    rotuloBreadcrumb: 'Motivos de Denúncia',
    // Grupo CONFIGURACOES: é catálogo de configuração, não fila de moderação.
    grupoMenu: 'CONFIGURACOES',
    icone: 'fa-flag',
  },

  // Campanhas (módulo 12-campanha): grupo próprio ('CAMPANHA', ver admin-menu.constants): não cabe em GESTÃO
  // DO USUÁRIO (não é sobre gerenciar quem é o usuário) nem em MODERAÇÃO (a fila de aprovação/denúncia); é só
  // "ver as campanhas que existem", mais parecido com a listagem de Usuários. Fica antes de MODERAÇÃO: ver
  // campanhas antes de moderar.
  {
    caminho: '/admin/campanhas',
    caminhoRelativo: 'campanhas',
    elemento: ListarCampanhas,
    rotuloMenu: 'Campanhas',
    rotuloBreadcrumb: 'Campanhas',
    grupoMenu: 'CAMPANHA',
    icone: 'fa-bullhorn',
  },
  // As atualizações de todas as campanhas, com os anexos: a moderação oculta e mostra de novo (atualizacao_moderar).
  {
    caminho: '/admin/atualizacoes',
    caminhoRelativo: 'atualizacoes',
    elemento: ListarAtualizacoes,
    rotuloMenu: 'Atualizações',
    rotuloBreadcrumb: 'Atualizações',
    grupoMenu: 'CAMPANHA',
    icone: 'fa-newspaper',
  },

  // Fila de aprovação: item do grupo MODERAÇÃO.
  {
    caminho: '/admin/aprovar-campanhas',
    caminhoRelativo: 'aprovar-campanhas',
    elemento: AprovarCampanhas,
    rotuloMenu: 'Aprovar Campanhas',
    rotuloBreadcrumb: 'Aprovar Campanhas',
    grupoMenu: 'MODERACAO',
    icone: 'fa-clipboard-check',
  },
  {
    caminho: '/admin/denuncias',
    caminhoRelativo: 'denuncias',
    elemento: ListarDenuncias,
    rotuloMenu: 'Denúncias',
    rotuloBreadcrumb: 'Denúncias',
    grupoMenu: 'MODERACAO',
    icone: 'fa-flag',
  },
  {
    caminho: '/admin/pedidos-encerramento',
    caminhoRelativo: 'pedidos-encerramento',
    elemento: ListarEncerramentos,
    rotuloMenu: 'Pedido de Encerramento',
    rotuloBreadcrumb: 'Pedidos de Encerramento',
    grupoMenu: 'MODERACAO',
    icone: 'fa-flag-checkered',
  },

  // Pagamentos (módulo 25-pagamento-revisao): as filas do que o sistema deliberadamente NÃO resolve sozinho no
  // dinheiro (webhook em revisão manual, estorno que desistiu, repasse em erro). Grupo próprio ('PAGAMENTOS'): não é
  // fila de moderação de conteúdo, e é onde moram as telas financeiras (as filas e a auditoria financeira). Quem vê e
  // quem age é decidido pelo banco, por permissão (evento_pagamento_visualizar para ver, pagamento_revisao_resolver para agir).
  {
    caminho: '/admin/eventos-pagamento',
    caminhoRelativo: 'eventos-pagamento',
    elemento: ListarRevisoesPagamento,
    rotuloMenu: 'Eventos de Pagamento',
    rotuloBreadcrumb: 'Eventos de Pagamento',
    grupoMenu: 'PAGAMENTOS',
    icone: 'fa-file-circle-exclamation',
  },
  {
    caminho: '/admin/reembolsos-manuais',
    caminhoRelativo: 'reembolsos-manuais',
    elemento: ListarReembolsosManuais,
    rotuloMenu: 'Reembolsos Manuais',
    rotuloBreadcrumb: 'Reembolsos Manuais',
    grupoMenu: 'PAGAMENTOS',
    icone: 'fa-money-bill-transfer',
  },
  {
    caminho: '/admin/repasses-atencao',
    caminhoRelativo: 'repasses-atencao',
    elemento: ListarRepassesAtencao,
    rotuloMenu: 'Repasses em Atenção',
    rotuloBreadcrumb: 'Repasses em Atenção',
    grupoMenu: 'PAGAMENTOS',
    icone: 'fa-hand-holding-dollar',
  },
  // Só leitura: todas as contribuições, com a situação do repasse (contribuicao_visualizar_sensivel: admin).
  {
    caminho: '/admin/contribuicoes',
    caminhoRelativo: 'contribuicoes',
    elemento: ListarContribuicoes,
    rotuloMenu: 'Contribuições',
    rotuloBreadcrumb: 'Contribuições',
    grupoMenu: 'PAGAMENTOS',
    icone: 'fa-hand-holding-heart',
  },
  // Só leitura: todos os repasses ao pesquisador (repasse_aprovar: admin).
  {
    caminho: '/admin/repasses',
    caminhoRelativo: 'repasses',
    elemento: ListarRepasses,
    rotuloMenu: 'Repasses',
    rotuloBreadcrumb: 'Repasses',
    grupoMenu: 'PAGAMENTOS',
    icone: 'fa-money-check-dollar',
  },
  // Só leitura: cada mudança de dinheiro com quem fez (auditoria_financeira_visualizar: admin e revisor).
  {
    caminho: '/admin/auditoria-financeira',
    caminhoRelativo: 'auditoria-financeira',
    elemento: ListarAuditoriaFinanceira,
    rotuloMenu: 'Auditoria Financeira',
    rotuloBreadcrumb: 'Auditoria Financeira',
    grupoMenu: 'PAGAMENTOS',
    icone: 'fa-scale-balanced',
  },

  // Sem rota própria (são modais abertos direto pela listagem): Criar/Alterar/Consultar/Excluir de Usuário,
  // Parâmetro do Sistema, Área de Conhecimento, Tipo de Link e Motivo de Denúncia; Alterar de Papel; Consultar
  // de Campanha e de Pesquisador; Criar, Consultar, Alterar e Excluir de Termo de Uso; Consultar e dar baixa
  // (Eventos de Pagamento), registrar devolução (Reembolsos Manuais) e reenfileirar ou marcar como pago (Repasses em Atenção).

  // Campo de Testes: só em desenvolvimento e só se a pasta existir (ver campo-testes-opcional.ts).
  ...(campoTestes?.ROTAS_CAMPO_TESTES ?? []),
];
