import { PADRAO_MARCA } from './montar-texto-modelo';

// Confere um texto de modelo_mensagem antes de gravar: toda marca {{...}} bem escrita, todo trecho {{#campo}} ou
// {{^campo}} fechado por {{/campo}} (sem trecho dentro de trecho) e só campos que o tipo do aviso tem. Devolve a
// mensagem para a tela, ou null se estiver tudo certo.
export function validarModelo(
  rotulo: string,
  texto: string,
  campos: readonly string[],
): string | null {
  const marcas = [...texto.matchAll(PADRAO_MARCA)];
  if (
    (texto.match(/\{\{/g) ?? []).length !== marcas.length ||
    (texto.match(/\}\}/g) ?? []).length !== marcas.length
  ) {
    return `${rotulo}: há uma marca mal escrita. Use {{campo}}, só com letras minúsculas, números e _.`;
  }

  let aberto: string | null = null;
  for (const [, sinal, campo] of marcas) {
    if (!campos.includes(campo)) {
      return `${rotulo}: {{${campo}}} não existe neste aviso. Campos disponíveis: ${campos.join(', ')}.`;
    }
    if (sinal === '#' || sinal === '^') {
      if (aberto)
        return `${rotulo}: feche {{/${aberto}}} antes de abrir outro trecho.`;
      aberto = campo;
    } else if (sinal === '/') {
      if (aberto !== campo)
        return `${rotulo}: {{/${campo}}} fecha um trecho que não foi aberto.`;
      aberto = null;
    }
  }
  if (aberto) return `${rotulo}: falta fechar o trecho com {{/${aberto}}}.`;
  return null;
}
