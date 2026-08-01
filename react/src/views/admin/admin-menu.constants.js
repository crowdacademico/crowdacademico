// Grupos do menu lateral — mesma ideia do Projeto de Interface real
// (informacoes/Sem-Node-Projeto-de-Interface-CrowdAcademico/telas/admin/admin.data.js,
// adminMenuGroups), só que com os módulos que JÁ existem no Nest ativos e
// os que ainda não têm rota nenhuma marcados `desabilitado: true` — mostra
// a forma do painel completo sem fingir que uma tela que não existe funciona.
export const GRUPOS_MENU_ADMIN = [
  {
    titulo: 'CADASTROS',
    itens: [
      { aba: 'usuarios', rotulo: 'Usuários' },
      { aba: 'papeis', rotulo: 'Papéis & Permissões' },
      { aba: 'configuracoes', rotulo: 'Configurações' },
    ],
  },
  {
    titulo: 'MODERAÇÃO',
    itens: [
      { aba: 'aprovar', rotulo: 'Aprovar Campanhas', desabilitado: true },
      { aba: 'denuncias', rotulo: 'Denúncias', desabilitado: true },
      { aba: 'solicitacoes', rotulo: 'Solicitações', desabilitado: true },
      { aba: 'encerramentos', rotulo: 'Enc. Antecipados', desabilitado: true },
    ],
  },
];
