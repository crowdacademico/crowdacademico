import { ROTAS_ADMIN } from '../../services/router/rotas.constants';

// Discriminado por `desabilitado`: item real (de ROTAS_ADMIN, via
// itensDoGrupo) sempre tem `caminho`; placeholder (escrito à mão abaixo,
// ainda sem tela) só tem `rotulo`. admin-sidebar.tsx narrowa por
// `item.desabilitado` pra saber qual dos dois formatos tem em mãos.
interface ItemMenuAdminReal {
  caminho: string;
  rotulo?: string;
  icone?: string;
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
    // Itens com tela vêm de `itensDoGrupo('MODERACAO')` (hoje Aprovar Campanhas); os demais são placeholders
    // desabilitados até ganharem tela.
    itens: [
      ...itensDoGrupo('MODERACAO'),
      { rotulo: 'Denúncias', desabilitado: true },
      { rotulo: 'Solicitações', desabilitado: true },
      { rotulo: 'Enc. Antecipados', desabilitado: true },
    ],
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
          // Telas administrativas para testar, pela interface (não só por Thunder Client), módulos
          // que só fariam sentido testar pela área PÚBLICA do site (que ainda não existe em React).
          // O que for criado aqui nunca aparece pro usuário final, é só ferramenta de teste interna.
          // `dica` (só este grupo tem) vira um Tooltip do lado direito do título em vez do ícone
          // normal de item (ver admin-sidebar.tsx).
          titulo: 'CAMPO DE TESTES',
          dica: 'Este submenu é para testar campos que só seriam possíveis na área pública e para ferramentas de desenvolvimento, como o Guia de Estilo. Nada daqui aparece para o usuário final.',
          itens: itensDoGrupo('CAMPO_TESTES'),
        },
      ]
    : []),
];
