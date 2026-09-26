import type { TipoTermo } from '../type/termo-uso.type';

// Tradução code -> rótulo amigável, mesmo espírito de permissao-nomes-amigaveis.ts: `tipo` é o identificador
// estável usado pelo banco (enum tipo_termo, 01_extensoes_enums_tabelas.sql), esta tabela é só a camada de
// exibição.
export const TIPOS_TERMO: TipoTermo[] = ['cadastro', 'contribuicao', 'upgrade_pesquisador'];

export const ROTULO_TIPO_TERMO: Record<TipoTermo, string> = {
  cadastro: 'Cadastro',
  contribuicao: 'Contribuição',
  upgrade_pesquisador: 'Upgrade Pesquisador',
};

// Descrição curta pro card de Regras do Negócio (explica QUANDO cada
// trilha é exibida a um usuário, já que elas nunca aparecem juntas na
// mesma tela).
export const DESCRICAO_TIPO_TERMO: Record<TipoTermo, string> = {
  cadastro: 'Aceito uma vez, no cadastro da conta.',
  contribuicao: 'Aceito a cada contribuição a uma campanha.',
  upgrade_pesquisador: 'Aceito ao solicitar upgrade pra perfil de pesquisador.',
};
