import { TIPO_TERMO } from '../../constant/type/enums-do-banco.gerado';
import type { TipoTermo } from '../type/termo-uso.type';

// Tradução code -> rótulo amigável, mesmo espírito de permissao-nomes-amigaveis.constants.ts: `tipo` é o identificador
// estável usado pelo banco (enum tipo_termo, 01_extensoes_enums_tabelas.sql), esta tabela é só a camada de
// exibição. A lista de valores vem do banco (enums-do-banco.gerado.ts).
export const TIPOS_TERMO = TIPO_TERMO;

export function ehTipoTermo(valor: string | null): valor is TipoTermo {
  return TIPOS_TERMO.some((tipo) => tipo === valor);
}

export const ROTULO_TIPO_TERMO: Record<TipoTermo, string> = {
  cadastro: 'Conta e contribuições',
  upgrade_pesquisador: 'Upgrade Pesquisador',
};

// Descrição curta de QUANDO cada termo é exibido a um usuário (card de Regras do Negócio e tela de publicar).
export const DESCRICAO_TIPO_TERMO: Record<TipoTermo, string> = {
  cadastro: 'Aceito no cadastro da conta e confirmado a cada contribuição a uma campanha.',
  upgrade_pesquisador: 'Aceito ao solicitar upgrade pra perfil de pesquisador.',
};
