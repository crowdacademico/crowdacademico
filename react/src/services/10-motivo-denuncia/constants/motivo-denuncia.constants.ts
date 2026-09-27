import type { TipoMotivoDenuncia } from '../type/motivo-denuncia.type';

// Espelha o limite físico da coluna `descricao VARCHAR(255)` de `motivo_denuncia`
// (01_extensoes_enums_tabelas.sql): não é regra de negócio ajustável (por isso não mora em `configuracoes`), é
// o tamanho real da coluna no banco. Compartilhado entre Criar e Alterar.
export const LIMITE_DESCRICAO_MOTIVO_DENUNCIA = 255;

// Rótulo legível pro `tipo` cru ('campanha' | 'perfil'). É a única lista dos tipos no React: as opções do
// <select> de Criar/Alterar e a guarda abaixo saem daqui, então um tipo novo no enum entra num lugar só.
export const ROTULO_TIPO_MOTIVO_DENUNCIA: Record<TipoMotivoDenuncia, string> = {
  campanha: 'Campanha',
  perfil: 'Perfil',
};

// Guarda de tipo em vez de `as` pra provar ao TypeScript que o valor cru do DOM (sempre `string`) é um
// `TipoMotivoDenuncia` de verdade antes de guardar no estado.
export function ehTipoMotivoDenuncia(valor: string): valor is TipoMotivoDenuncia {
  return Object.hasOwn(ROTULO_TIPO_MOTIVO_DENUNCIA, valor);
}
