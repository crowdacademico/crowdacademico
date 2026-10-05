import type { ComponentType } from 'react';
import type { PropsPagina } from './pagina.type';
import { LoginPage } from '../../views/3-auth/login-page';
import { CadastroPage } from '../../views/3-auth/cadastro-page';
import { VerificarEmailPage } from '../../views/3-auth/verificar-email-page';
import { EsqueciSenhaPage } from '../../views/3-auth/esqueci-senha-page';
import { RedefinirSenhaPage } from '../../views/3-auth/redefinir-senha-page';
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
import { MinhasCampanhas } from '../../views/12-campanha/minhas-campanhas';
import { AprovarCampanhas } from '../../views/12-campanha/aprovar-campanhas';
import { ListarDenuncias } from '../../views/19-denuncia/listar-denuncias';
import { ListarEncerramentos } from '../../views/20-solicitacao-encerramento/listar-encerramentos';
import { BancadaPesquisador } from '../../views/campo-testes/bancada-pesquisador';
import { BancadaCampanha } from '../../views/campo-testes/bancada-campanha';
import { CampanhasSeguidas } from '../../views/campo-testes/campanhas-seguidas';
import { GuiaEstilo } from '../../views/campo-testes/guia-estilo/1-guia-estilo';
import { ListarTermosUso } from '../../views/5-termo-uso/listar-termos-uso';
import { PontuacaoScore } from '../../views/11-configuracoes/pontuacao-score';

// Fonte única de verdade para "quais páginas existem": App.tsx monta as <Route> daqui e breadcrumb.tsx monta
// o rótulo daqui. rotuloBreadcrumb: null = não aparece no breadcrumb.
//
// Duas listas porque descrevem coisas diferentes: ROTAS são páginas PÚBLICAS/pré-login (Header/Breadcrumb/
// Footer, sem sidebar): login, cadastro, verificar e-mail. ROTAS_ADMIN é TUDO que precisa do menu lateral,
// renderizado dentro do <Outlet/> de views/admin/admin-layout.tsx (sidebar + área de conteúdo compartilhadas).
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
    rotuloMenu: 'Pedidos de Encerramento',
    rotuloBreadcrumb: 'Pedidos de Encerramento',
    grupoMenu: 'MODERACAO',
    icone: 'fa-flag-checkered',
  },

  // Minha Conta: dentro do painel (sidebar visível), mas sem rotuloMenu/grupoMenu: não é uma aba clicável
  // do menu (o acesso é pelo dropdown do cabeçalho), só ganha a moldura. Sem paiCaminho: não é filha de
  // nenhuma listagem, o breadcrumb já fica "Início > Minha Conta".
  //
  // `:aba` (Perfil/Segurança/Papéis/Acadêmico/Privacidade): UMA rota parametrizada, não 5 entradas: MinhaConta
  // lê `aba` via useParams() e decide o que renderizar por baixo da faixa de identidade (que não muda entre
  // abas). É o ÚNICO parâmetro de rota do painel admin (as telas com `:id` são modais). O caminho SEM
  // `/:aba` (ex.: link direto para "/admin/minha-conta") ganha um redirect para ".../perfil" em App.tsx, não
  // precisa de uma 2ª entrada aqui.
  {
    caminho: '/admin/minha-conta/:aba',
    caminhoRelativo: 'minha-conta/:aba',
    elemento: MinhaConta,
    rotuloBreadcrumb: 'Minha Conta',
  },

  // Sem rota própria (são modais abertos direto pela listagem): Criar/Alterar/Consultar/Excluir de Usuário,
  // Parâmetro do Sistema, Área de Conhecimento, Tipo de Link e Motivo de Denúncia; Alterar de Papel; Consultar
  // de Campanha e de Pesquisador; Criar, Consultar, Alterar e Excluir de Termo de Uso.

  // A área de testes vive só neste trecho e NÃO está nos requisitos funcionais (o arquivo inteiro é a
  // fonte única de verdade de TODAS as rotas, não só as dele).
  //
  // `import.meta.env.DEV`: em build de produção este array fica vazio, a rota nem existe e o grupo some do
  // menu (admin-menu.constants só mostra o que `itensDoGrupo` acha aqui). Em desenvolvimento é ferramenta,
  // em produção seria uma porta escancarada.
  ...(import.meta.env.DEV
    ? [
        {
          caminho: '/admin/campo-testes/pesquisador',
          caminhoRelativo: 'campo-testes/pesquisador',
          elemento: BancadaPesquisador,
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
          // Minhas Campanhas: o pesquisador não usa a área restrita (ele terá a área dele na parte pública);
          // aqui fica só para testar o fluxo dele (criar, completar, enviar, corrigir).
          caminho: '/admin/campo-testes/minhas-campanhas',
          caminhoRelativo: 'campo-testes/minhas-campanhas',
          elemento: MinhasCampanhas,
          rotuloMenu: 'T3 - Minhas Campanhas',
          rotuloBreadcrumb: 'T3 - Minhas Campanhas',
          grupoMenu: 'CAMPO_TESTES',
          icone: 'fa-folder-open',
        },
        {
          // Campanhas que a conta logada segue (seguir, deixar de seguir, consultar as atualizações).
          caminho: '/admin/campo-testes/campanhas-seguidas',
          caminhoRelativo: 'campo-testes/campanhas-seguidas',
          elemento: CampanhasSeguidas,
          rotuloMenu: 'T4 - Campanhas Seguidas',
          rotuloBreadcrumb: 'T4 - Campanhas Seguidas',
          grupoMenu: 'CAMPO_TESTES',
          icone: 'fa-bell',
        },
        {
          // Guia de Estilo: cores nos dois temas, tipografia e componentes reais.
          caminho: '/admin/campo-testes/guia-estilo',
          caminhoRelativo: 'campo-testes/guia-estilo',
          elemento: GuiaEstilo,
          rotuloMenu: 'Guia de Estilo',
          rotuloBreadcrumb: 'Guia de Estilo',
          grupoMenu: 'CAMPO_TESTES',
          icone: 'fa-palette',
        },
      ]
    : []),
];
