// Busca por texto em todo o sistema: ignora acentos, maiúsculas e espaços repetidos, para "sao paulo" achar
// "São Paulo" e "matematica" achar "Matemática". NFD separa a letra do acento; \p{Diacritic} remove o acento.
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// `termoNormalizado` já passou por normalizarBusca (normaliza uma vez, compara com muitas linhas).
export function contemTermo(valor: unknown, termoNormalizado: string): boolean {
  if (valor === null || valor === undefined) {
    return false;
  }
  const texto = typeof valor === 'string' ? valor : typeof valor === 'number' || typeof valor === 'boolean' ? String(valor) : '';
  return normalizarBusca(texto).includes(termoNormalizado);
}
