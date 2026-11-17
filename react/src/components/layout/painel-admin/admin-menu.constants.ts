import { podeVerRota, ROTAS_ADMIN } from '../../../services/router/rotas.constants';

// Discriminado por `desabilitado`: item real (de ROTAS_ADMIN, via
// itensDoGrupo) sempre tem `caminho`; placeholder (escrito à mão abaixo,
// ainda sem tela) só tem `rotulo`. admin-sidebar.tsx narrowa por
// `item.desabilitado` pra saber qual dos dois formatos tem em mãos.
interface ItemMenuAdminReal {
  caminho: string;
  rotulo?: string;
  icone?: string;
  // As permissões que liberam a tela (`Rota.permissoes`); o menu esconde a tela que a conta não consegue usar.
  permissoes?: readonly string[];
  desabilitado?: false;
}

interface ItemMenuAdminPlaceholder {
  rotulo: string;
  desabilitado: true;
}

type ItemMenuAdmin = ItemMenuAdminReal | ItemMenuAdminPlaceholder;

interface GrupoMenuAdmin {
  titulo: string | null;
  divisorApos?: boolean;
  dica?: string;
  itens: ItemMenuAdmin[];
}

function itensDoGrupo(grupoMenu: string | null): ItemMenuAdminReal[] {
  return ROTAS_ADMIN.filter((rota) => rota.grupoMenu === grupoMenu).map((rota) => ({
    caminho: rota.caminho,
    rotulo: rota.rotuloMenu,
    icone: rota.icone,
    permissoes: rota.permissoes,
  }));
}

// Grupos do menu lateral: mesma ideia do `adminMenuGroups` do Projeto de Interface.
// CADASTROS vem direto de ROTAS_ADMIN (rotas.constants.ts): não é uma lista própria (duas listas descrevendo as
// mesmas abas correriam o risco de desalinhar). MODERAÇÃO tem placeholders escritos à mão para os itens que
// ainda não têm rota: são só o desenho do painel completo, sem fingir que uma tela que não existe funciona.
//
// O 1º grupo (Dashboard) não tem `titulo`: é navegação de outro nível, não um cadastro, então não ganha um
// cabeçalho "CADASTROS"-like acima dele; `divisorApos` desenha só a linha fina que separa ele do resto (ver
// admin-sidebar.tsx).
export const GRUPOS_MENU_ADMIN: GrupoMenuAdmin[] = [
  {
    titulo: null,
    divisorApos: true,
    itens: itensDoGrupo(null),
  },
  {
    // GESTÃO DO USUÁRIO: cadastro em torno de quem é o usuário e o que ele pode fazer/publicar: Usuários,
    // Pesquisadores (um pesquisador é um usuário com um perfil a mais, não entidade separada), Papéis &
    // Permissões, e Áreas do Conhecimento e Tipos de Link (catálogos usados pelo perfil de
    // pesquisador/campanha). `grupoMenu: 'CADASTROS'` em rotas.constants.ts continua com o nome antigo de
    // propósito: é só a CHAVE interna que liga rota↔grupo, não aparece na tela; só o rótulo visível muda.
    titulo: 'GESTÃO DO USUÁRIO',
    itens: itensDoGrupo('CADASTROS'),
  },
  {
    // Os avisos ao usuário (e-mail e sino): o que saiu e para quem (Notificações). O texto de cada aviso (Mensagens) é
    // configuração e mora em Configurações. Logo abaixo de GESTÃO DO USUÁRIO: é a conversa do sistema com a pessoa,
    // quase parte da gestão dela.
    titulo: 'COMUNICAÇÕES',
    itens: itensDoGrupo('COMUNICACOES'),
  },
  {
    // Configurações é um grupo próprio: um item chamado "Configurações" dentro de um grupo TAMBÉM chamado
    // Configurações ficaria esquisito. O item em si é "Parâmetros do Sistema" (ver comentário completo em
    // rotas.constants.ts, onde o grupoMenu 'CONFIGURACOES' é definido); o grupo já nasce com o nome certo para
    // receber mais itens sem precisar renomear.
    titulo: 'Configurações',
    itens: itensDoGrupo('CONFIGURACOES'),
  },
  {
    // Grupo próprio: não é "gestão do usuário" (não é sobre quem é o usuário) nem "moderação" (aquele grupo é a
    // FILA de aprovação/denúncia; isto aqui é só ver o que já existe, mais perto do espírito de "Usuários" do
    // que de "Aprovar Campanhas"). Fica logo antes de MODERAÇÃO: faz sentido navegar "ver campanhas" antes de
    // "moderar campanhas".
    titulo: 'CAMPANHA',
    itens: itensDoGrupo('CAMPANHA'),
  },
  {
    titulo: 'MODERAÇÃO',
    // Aprovar Campanhas, Denúncias e Pedidos de Encerramento (os pedidos de encerramento antecipado).
    itens: itensDoGrupo('MODERACAO'),
  },
  {
    // Filas financeiras: o que o sistema não resolve sozinho no dinheiro (evento de webhook em revisão manual,
    // estorno que desistiu, repasse em erro ou esperando a chave Pix). Vem depois de MODERAÇÃO: é fila de operação,
    // não de conteúdo. As listagens gerais (contribuições, repasses, auditoria financeira) entram aqui quando existirem.
    titulo: 'PAGAMENTOS',
    itens: itensDoGrupo('PAGAMENTOS'),
  },
  // ESTE BLOCO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES. NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
  //
  // `import.meta.env.DEV` envolve o objeto inteiro, não só `itens`: se só os ITENS estivessem protegidos por
  // DEV (em rotas.constants.ts), o GRUPO em si (título "CAMPO DE TESTES" + tooltip explicando o que é)
  // continuaria aparecendo no build de produção, vazio mas visível, o que já vazaria a existência da ferramenta
  // para o usuário final (a string "CAMPO DE TESTES" aparecia no bundle final). Com o objeto inteiro no
  // ternário, o grupo desaparece do array em produção: nem o título é gerado.
  ...(import.meta.env.DEV
    ? [
        {
          // Ferramentas para testar pela interface (não só por Thunder Client): criar dados em nome de outros, simular
          // o provedor de pagamento, ver a caixa de e-mails. Nasceram antes da área pública; continuam úteis para testar
          // rápido o que, no site, exigiria várias contas e telas.
          // O que for criado aqui nunca aparece pro usuário final, é só ferramenta de teste interna.
          // `dica` (só este grupo tem) vira um Tooltip do lado direito do título em vez do ícone
          // normal de item (ver admin-sidebar.tsx).
          titulo: 'CAMPO DE TESTES',
          dica: 'Ferramentas de desenvolvimento e de teste: criar dados em nome de outras contas, simular o provedor de pagamento, a caixa de e-mails e o Guia de Estilo. Nada daqui aparece para o usuário final.',
          itens: itensDoGrupo('CAMPO_TESTES'),
        },
      ]
    : []),
];

// O menu desta conta (17-11-2026): só as telas que as permissões dela liberam, e só os grupos que sobram com alguma
// tela. Quem protege os dados continua sendo o banco; aqui é só para não oferecer a tela que viria vazia.
export function gruposMenuDaConta(permissoesDaConta: readonly string[]): GrupoMenuAdmin[] {
  return GRUPOS_MENU_ADMIN.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.filter((item) => item.desabilitado || podeVerRota(item, permissoesDaConta)),
  })).filter((grupo) => grupo.itens.some((item) => !item.desabilitado));
}
