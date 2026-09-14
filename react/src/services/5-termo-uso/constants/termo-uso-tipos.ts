import type { TipoTermo } from '../type/termo-uso.type';

// Tradução code -> rótulo amigável (13-09-2026), mesmo espírito de
// permissao-nomes-amigaveis.ts - `tipo` é o identificador estável usado
// pelo banco (enum tipo_termo, 01_extensoes_enums_tabelas.sql), esta
// tabela é só a camada de exibição.
export const TIPOS_TERMO: TipoTermo[] = ['cadastro', 'contribuicao'];

export const ROTULO_TIPO_TERMO: Record<TipoTermo, string> = {
  cadastro: 'Cadastro',
  contribuicao: 'Contribuição',
};

// Descrição curta pro card de Regras do Negócio (explica QUANDO cada
// trilha é exibida a um usuário, já que as 2 nunca aparecem juntas na
// mesma tela).
export const DESCRICAO_TIPO_TERMO: Record<TipoTermo, string> = {
  cadastro: 'Aceito uma vez, no cadastro da conta.',
  contribuicao: 'Aceito a cada contribuição a uma campanha.',
};
