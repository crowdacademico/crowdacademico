import { ROTAS_ADMIN } from '../../services/router/rotas.constants';

// Grupos do menu lateral — mesma ideia do Projeto de Interface real
// (informacoes/Sem-Node-Projeto-de-Interface-CrowdAcademico/telas/admin/admin.data.js,
// adminMenuGroups). CADASTROS vem direto de ROTAS_ADMIN (rotas.constants.js)
// — não é mais uma lista própria: antes existiam 2 listas (esta e ROTAS)
// descrevendo as mesmas 3 abas, com risco de desalinhar. MODERAÇÃO continua
// escrita à mão porque esses itens não têm rota nenhuma ainda — são só o
// desenho do painel completo, sem fingir que uma tela que não existe funciona.
export const GRUPOS_MENU_ADMIN = [
  {
    titulo: 'CADASTROS',
    itens: ROTAS_ADMIN.map((rota) => ({
      caminho: rota.caminho,
      rotulo: rota.rotuloMenu,
    })),
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
