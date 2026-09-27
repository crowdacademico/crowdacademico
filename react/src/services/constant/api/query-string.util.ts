// Filtro de listagem -> "?chave=valor&...": cada campo preenchido vira um parâmetro, `undefined` fica de fora.
// Sem filtro (ou todo vazio) devolve "". Serve a qualquer interface de filtro dos services/*/api.
export function paraQueryString<F extends object>(filtro?: F): string {
  if (!filtro) {
    return '';
  }
  const params = new URLSearchParams();
  Object.entries(filtro).forEach(([chave, valor]: [string, unknown]) => {
    if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
      params.set(chave, String(valor));
    }
  });
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}
