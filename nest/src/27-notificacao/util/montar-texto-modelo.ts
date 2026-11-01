// Monta o texto de um modelo_mensagem com os dados de um aviso (notificacao.dados). Três marcas, sempre com o nome de
// um campo dos dados:
//   {{campo}}               o valor, já formatado (dinheiro em reais, data em dd/mm/aaaa);
//   {{#campo}}...{{/campo}} o trecho só aparece com o campo preenchido;
//   {{^campo}}...{{/campo}} o trecho só aparece sem ele.
// Preenchido = nem vazio, nem zero, nem falso. Os parágrafos são separados por linha em branco; o que ficou vazio some.
// Mesmo formato do Mustache (Postmark, Mailchimp), sem laço nem trecho dentro de trecho.

const CAMPOS_MOEDA = new Set(['valor']);
const CAMPOS_DATA = new Set([
  'prazo_reenvio_ate',
  'data_prevista',
  'suspenso_ate',
]);

export const PADRAO_MARCA = /\{\{([#^/]?)([a-z0-9_]+)\}\}/g;
const PADRAO_TRECHO =
  /\{\{([#^])([a-z0-9_]+)\}\}((?:(?!\{\{[#^/])[\s\S])*?)\{\{\/\2\}\}/g;
const PADRAO_CAMPO = /\{\{([a-z0-9_]+)\}\}/g;

export function preenchido(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === false) return false;
  if (typeof valor === 'number') return valor !== 0;
  if (typeof valor === 'string') return valor.trim() !== '';
  return true;
}

function formatar(campo: string, valor: unknown): string {
  if (!preenchido(valor) && valor !== 0) return '';
  if (CAMPOS_MOEDA.has(campo) && Number.isFinite(Number(valor))) {
    return Number(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
  if (CAMPOS_DATA.has(campo)) {
    const data = new Date(String(valor));
    if (!Number.isNaN(data.getTime())) {
      return data.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      });
    }
  }
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor);
  }
  return '';
}

export function montarTexto(
  modelo: string,
  dados: Record<string, unknown>,
): string {
  return modelo
    .replace(
      PADRAO_TRECHO,
      (_marca, sinal: string, campo: string, trecho: string) =>
        preenchido(dados[campo]) === (sinal === '#') ? trecho : '',
    )
    .replace(PADRAO_CAMPO, (_marca, campo: string) =>
      formatar(campo, dados[campo]),
    );
}

export function montarParagrafos(
  modelo: string,
  dados: Record<string, unknown>,
): string[] {
  return montarTexto(modelo, dados)
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((paragrafo) => paragrafo.trim())
    .filter((paragrafo) => paragrafo !== '');
}

// O primeiro nome, para a saudação do e-mail.
export function primeiroNome(dados: Record<string, unknown>): string | null {
  const nome =
    typeof dados.nome === 'string' ? dados.nome.trim().split(/\s+/)[0] : '';
  return nome || null;
}
