import { ROTAS_ADMIN } from '../../services/router/rotas.constants';

function itensDoGrupo(grupoMenu) {
  return ROTAS_ADMIN.filter((rota) => rota.grupoMenu === grupoMenu).map((rota) => ({
    caminho: rota.caminho,
    rotulo: rota.rotuloMenu,
    icone: rota.icone,
  }));
}

// Grupos do menu lateral - mesma ideia do Projeto de Interface real
// (informacoes/Sem-Node-Projeto-de-Interface-CrowdAcademico/telas/admin/admin.data.js,
// adminMenuGroups). CADASTROS vem direto de ROTAS_ADMIN (rotas.constants.js)
// - não é mais uma lista própria: antes existiam 2 listas (esta e ROTAS)
// descrevendo as mesmas 3 abas, com risco de desalinhar. MODERAÇÃO continua
// escrita à mão porque esses itens não têm rota nenhuma ainda - são só o
// desenho do painel completo, sem fingir que uma tela que não existe funciona.
//
// O 1º grupo (Dashboard, 08-08-2026) não tem `titulo` - é navegação de
// outro nível, não mais um cadastro (pedido do Lucas), então não ganha um
// cabeçalho "CADASTROS"-like acima dele; `divisorApos` desenha só a linha
// fina que separa ele do resto (ver admin-sidebar.jsx).
export const GRUPOS_MENU_ADMIN = [
  {
    titulo: null,
    divisorApos: true,
    itens: itensDoGrupo(null),
  },
  {
    // ERA "CADASTROS" (09-08-2026), depois "GESTÃO DE ACESSO E SISTEMA"
    // (mesmo dia). Virou "GESTÃO DO USUÁRIO" em 11-08-2026 (pedido do
    // Lucas) na mesma leva em que Configurações saiu daqui pro próprio
    // grupo (ver logo abaixo) - sobrou só cadastro em torno de quem é o
    // usuário e o que ele pode fazer/publicar: Usuários, Pesquisadores
    // (23-08-2026 - um pesquisador é um usuário com um perfil a mais, não
    // entidade separada), Papéis & Permissões, e Áreas do Conhecimento e
    // Tipos de Link (catálogos usados pelo perfil de pesquisador/
    // campanha). Motivos de
    // Denúncia MOROU aqui também por um dia (22-08-2026), mas mudou de
    // grupoMenu pra 'MODERACAO' no mesmo dia (pedido do Lucas) - ver
    // comentário completo em rotas.constants.js. `grupoMenu:
    // 'CADASTROS'` em rotas.constants.js continua com o nome antigo de
    // propósito - é só a CHAVE interna que liga rota↔grupo, não aparece
    // na tela; só o rótulo visível muda, igual já era antes.
    titulo: 'GESTÃO DO USUÁRIO',
    itens: itensDoGrupo('CADASTROS'),
  },
  {
    // NOVO (11-08-2026) - Configurações saiu do grupo acima e virou seu
    // próprio grupo (pedido do Lucas: ficava esquisito o item
    // "Configurações" dentro de um grupo TAMBÉM chamado Configurações
    // quando ele virasse um grupo próprio). O item em si foi renomeado
    // pra "Parâmetros do Sistema" (ver comentário completo em
    // rotas.constants.js, onde o grupoMenu 'CONFIGURACOES' é definido) -
    // por enquanto só tem 1 item, mas o grupo já nasce com o nome certo
    // pra receber mais no futuro sem precisar renomear de novo.
    titulo: 'Configurações',
    itens: itensDoGrupo('CONFIGURACOES'),
  },
  {
    // NOVO (23-08-2026, pedido do Lucas: "tipo o Menu de Usuários", pra
    // ver as campanhas criadas). Grupo próprio - não é "gestão do
    // usuário" (não é sobre quem é o usuário) nem "moderação" (aquele
    // grupo é a FILA de aprovação/denúncia, ainda não construída; isto
    // aqui é só ver o que já existe, mais perto do espírito de
    // "Usuários" do que de "Aprovar Campanhas"). Fica logo antes de
    // MODERAÇÃO - faz sentido navegar "ver campanhas" antes de "moderar
    // campanhas".
    titulo: 'CAMPANHA',
    itens: itensDoGrupo('CAMPANHA'),
  },
  {
    titulo: 'MODERAÇÃO',
    // Motivos de Denúncia (22-08-2026, pedido do Lucas) - primeiro item
    // REAL do grupo, no topo, na frente dos 4 placeholders desabilitados
    // abaixo (que ainda não têm tela nenhuma por trás). `itensDoGrupo`
    // devolve tudo que tiver `grupoMenu: 'MODERACAO'` em
    // rotas.constants.js - hoje só esse item, mas cresce sozinho quando
    // Aprovar Campanhas/Denúncias/etc. ganharem tela de verdade.
    itens: [
      ...itensDoGrupo('MODERACAO'),
      { rotulo: 'Aprovar Campanhas', desabilitado: true },
      { rotulo: 'Denúncias', desabilitado: true },
      { rotulo: 'Solicitações', desabilitado: true },
      { rotulo: 'Enc. Antecipados', desabilitado: true },
    ],
  },
  // ESTE BLOCO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES. NÃO ESTÁ NOS
  // REQUISITOS FUNCIONAIS E NEM ESTARÁ.
  //
  // `import.meta.env.DEV` (22-08-2026, achado ao testar: só os ITENS
  // estavam protegidos por DEV em rotas.constants.js - o GRUPO em si
  // (título "CAMPO DE TESTES" + tooltip explicando o que é) continuava
  // aparecendo no build de produção, vazio mas visível, o que já vazava a
  // existência da ferramenta pro usuário final. O `npm run build` de
  // verdade confirmou isso: a string "CAMPO DE TESTES" aparecia no bundle
  // final antes desta correção. Envolvendo o objeto inteiro (não só
  // `itens`) no ternário, o grupo inteiro desaparece do array em
  // produção - nem o título é gerado.
  ...(import.meta.env.DEV
    ? [
        {
          // Telas administrativas pra testar, pela interface (não só por
          // Thunder Client), módulos que hoje só fariam sentido testar
          // pela área PÚBLICA do site (que ainda não existe em React -
          // ver prompt-modulos-nucleo-claude-web.md). O que for criado
          // aqui nunca aparece pro usuário final, é só ferramenta de
          // teste interna. `dica` (só este grupo tem) vira um Tooltip do
          // lado direito do título em vez do ícone normal de item - ver
          // admin-sidebar.jsx.
          titulo: 'CAMPO DE TESTES',
          dica: 'Este submenu é para testar campos que só seriam possíveis na área pública. O que for criado aqui não aparece para o usuário final.',
          itens: itensDoGrupo('CAMPO_TESTES'),
        },
      ]
    : []),
];
