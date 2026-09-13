import type { TipoMotivoDenuncia } from '../type/motivo-denuncia.type';

// Espelha o limite físico da coluna `descricao VARCHAR(255)` de
// `motivo_denuncia` (01_extensoes_enums_tabelas.sql) - não é regra de
// negócio ajustável (por isso não mora em `configuracoes`), é o tamanho
// real da coluna no banco. Compartilhado entre Criar e Alterar (13-09-2026,
// achado do Claude Web: antes cada um tinha o número 255 hardcoded).
export const LIMITE_DESCRICAO_MOTIVO_DENUNCIA = 255;

// Rótulo legível pro `tipo` cru ('campanha' | 'perfil') - compartilhado
// entre Consultar e Excluir (antes duplicado igual nos dois arquivos).
export const ROTULO_TIPO_MOTIVO_DENUNCIA: Record<TipoMotivoDenuncia, string> = {
  campanha: 'Campanha',
  perfil: 'Perfil',
};

// `<select>` só tem essas 2 opções fixas - guarda de tipo em vez de `as`
// pra provar ao TypeScript que o valor cru do DOM (sempre `string`) é um
// `TipoMotivoDenuncia` de verdade antes de guardar no estado.
// Compartilhado entre Criar e Alterar (antes duplicado igual nos dois).
export function ehTipoMotivoDenuncia(valor: string): valor is TipoMotivoDenuncia {
  return valor === 'campanha' || valor === 'perfil';
}
