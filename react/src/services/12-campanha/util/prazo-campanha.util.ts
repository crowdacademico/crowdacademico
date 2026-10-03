// Hoje no formato do <input type="date"> (yyyy-mm-dd, fuso LOCAL): `toISOString()` usaria UTC, que cai no dia
// errado para quem está em fuso negativo (23h de 14/09 em Brasília já é 15/09 em UTC).
export function hojeISO(): string {
  return dataLocal(new Date().toISOString());
}

// Instante (ISO do backend) para o dia do <input type="date"> no fuso de quem usa. `slice(0, 10)` pegaria o dia
// em UTC: o fim de uma campanha (23:59 em Brasília) já é o dia seguinte em UTC.
export function dataLocal(iso: string): string {
  const data = new Date(iso);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

// Dia do <input type="date"> para o instante que vai ao backend, no fuso de quem usa. `new Date('2026-10-04')`
// seria meia-noite em UTC, que em Brasília é 21:00 do dia anterior: a campanha começaria e terminaria um dia antes.
// A campanha vale do começo do dia de início até o fim do dia de fim, como no Catarse e no Kickstarter.
function instanteLocal(data: string, hora: number, minuto: number, segundo: number): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto, segundo).toISOString();
}

export function inicioDoDia(data: string): string {
  return instanteLocal(data, 0, 0, 0);
}

export function fimDoDia(data: string): string {
  return instanteLocal(data, 23, 59, 59);
}

// Dias corridos entre duas datas yyyy-mm-dd; `null` enquanto falta uma delas.
export function duracaoEmDias(inicio: string, fim: string): number | null {
  if (!inicio || !fim) {
    return null;
  }
  return Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000);
}

// Data yyyy-mm-dd somada de N dias (no calendário local), no mesmo formato. Usada para sugerir a data de fim.
export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  return dataLocal(new Date(ano, mes - 1, dia + dias, 12).toISOString());
}
