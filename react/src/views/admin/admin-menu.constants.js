import { ROTAS_ADMIN } from '../../services/router/rotas.constants';

function itensDoGrupo(grupoMenu) {
  return ROTAS_ADMIN.filter((rota) => rota.grupoMenu === grupoMenu).map((rota) => ({
    caminho: rota.caminho,
    rotulo: rota.rotuloMenu,
    icone: rota.icone,
  }));
}

// Grupos do menu lateral — mesma ideia do Projeto de Interface real
// (informacoes/Sem-Node-Projeto-de-Interface-CrowdAcademico/telas/admin/admin.data.js,
// adminMenuGroups). CADASTROS vem direto de ROTAS_ADMIN (rotas.constants.js)
// — não é mais uma lista própria: antes existiam 2 listas (esta e ROTAS)
// descrevendo as mesmas 3 abas, com risco de desalinhar. MODERAÇÃO continua
// escrita à mão porque esses itens não têm rota nenhuma ainda — são só o
// desenho do painel completo, sem fingir que uma tela que não existe funciona.
//
// O 1º grupo (Dashboard, 08-08-2026) não tem `titulo` — é navegação de
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
    // grupo (ver logo abaixo) — sobrou só cadastro em torno de quem é o
    // usuário e o que ele pode fazer/publicar: Usuários, Papéis &
    // Permissões, e agora também Áreas do Conhecimento, Tipos de Link e
    // Motivos de Denúncia (catálogos usados pelo perfil de
    // pesquisador/campanha/denúncia — este último ativado em 22-08-2026,
    // ver comentário em rotas.constants.js). `grupoMenu:
    // 'CADASTROS'` em rotas.constants.js continua com o nome antigo de
    // propósito — é só a CHAVE interna que liga rota↔grupo, não aparece
    // na tela; só o rótulo visível muda, igual já era antes.
    titulo: 'GESTÃO DO USUÁRIO',
    itens: itensDoGrupo('CADASTROS'),
  },
  {
    // NOVO (11-08-2026) — Configurações saiu do grupo acima e virou seu
    // próprio grupo (pedido do Lucas: ficava esquisito o item
    // "Configurações" dentro de um grupo TAMBÉM chamado Configurações
    // quando ele virasse um grupo próprio). O item em si foi renomeado
    // pra "Parâmetros do Sistema" (ver comentário completo em
    // rotas.constants.js, onde o grupoMenu 'CONFIGURACOES' é definido) —
    // por enquanto só tem 1 item, mas o grupo já nasce com o nome certo
    // pra receber mais no futuro sem precisar renomear de novo.
    titulo: 'Configurações',
    itens: itensDoGrupo('CONFIGURACOES'),
  },
  {
    titulo: 'MODERAÇÃO',
    itens: [
      { rotulo: 'Aprovar Campanhas', desabilitado: true },
      { rotulo: 'Denúncias', desabilitado: true },
      { rotulo: 'Solicitações', desabilitado: true },
      { rotulo: 'Enc. Antecipados', desabilitado: true },
    ],
  },
];
