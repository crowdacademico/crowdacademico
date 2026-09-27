// O erro veio do Postgres com este SQLSTATE? Confere de verdade (objeto com `code`) em vez de afirmar o tipo com
// `as`: um erro que não é do banco (ex.: uma exceção HTTP) simplesmente não bate.
export function temCodigoPostgres(erro: unknown, codigo: string): boolean {
  return (
    typeof erro === 'object' &&
    erro !== null &&
    'code' in erro &&
    erro.code === codigo
  );
}
