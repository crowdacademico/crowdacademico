// Origem das contas no T1: as 7 contas "Sistema" do seed (07_seed_dados.sql, ids 1 a 7, uma por papel, usadas pelo
// login rápido) são "sistema"; todas as outras são "normal". A faceta "Origem" do T1 abre marcada em "normal" e
// esconde as 7, que não são material de teste.
export const ORIGEM_NORMAL = 'normal';

const ULTIMO_USUARIO_SISTEMA = 7;

export function origemUsuario(idUsuario: number): string {
  return idUsuario <= ULTIMO_USUARIO_SISTEMA ? 'sistema' : ORIGEM_NORMAL;
}
