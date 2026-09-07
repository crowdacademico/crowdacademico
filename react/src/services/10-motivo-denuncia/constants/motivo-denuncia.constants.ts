import type { TipoMotivoDenuncia } from '../type/motivo-denuncia.type';

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
