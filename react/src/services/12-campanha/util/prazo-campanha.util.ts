// Hoje no formato do <input type="date"> (yyyy-mm-dd, fuso LOCAL): `toISOString()` usaria UTC, que cai no dia
// errado para quem está em fuso negativo (23h de 14/09 em Brasília já é 15/09 em UTC).
export function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Dias corridos entre duas datas yyyy-mm-dd; `null` enquanto falta uma delas.
export function duracaoEmDias(inicio: string, fim: string): number | null {
  if (!inicio || !fim) {
    return null;
  }
  return Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000);
}
