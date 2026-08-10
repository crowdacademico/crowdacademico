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
    // ERA "CADASTROS" (09-08-2026, pedido do Lucas: "não me parece a
    // palavra mais ideal") — o grupo é gestão de conta/acesso/config do
    // sistema (Usuários, Papéis & Permissões, Configurações), não cadastro
    // de dado de negócio. `grupoMenu: 'CADASTROS'` em rotas.constants.js
    // continua com o nome antigo de propósito — é só a CHAVE interna que
    // liga rota↔grupo, não aparece na tela; só o rótulo visível mudou.
    titulo: 'GESTÃO DE ACESSO E SISTEMA',
    itens: itensDoGrupo('CADASTROS'),
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
