// Validações de um modelo de mensagem antes de virar uma nova versão. O admin edita o texto livremente, então o que
// pode dar errado em silêncio é barrado aqui (mensagem em português para a tela); o que o banco garante (texto
// imutável, canal e evento coerentes) continua sendo do banco.

const VARIAVEL_VALIDA = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

// O segredo é o token do link de verificação/recuperação (cifrado). Nunca pode ser impresso por um modelo.
const VARIAVEIS_PROIBIDAS = ['segredo'];

const PADROES_HTML_PERIGOSOS: { padrao: RegExp; motivo: string }[] = [
  { padrao: /<\s*script\b/i, motivo: 'tags <script>' },
  {
    padrao: /<\s*(iframe|object|embed|link|meta|base|form)\b/i,
    motivo:
      'tags <iframe>, <object>, <embed>, <link>, <meta>, <base> ou <form>',
  },
  {
    padrao: /<[^>]*\son[a-z]+\s*=/i,
    motivo: 'atributos de evento (onclick, onload...)',
  },
  { padrao: /javascript\s*:/i, motivo: 'links "javascript:"' },
  { padrao: /data\s*:\s*text\/html/i, motivo: 'links "data:text/html"' },
];

/** Variáveis {{nome}} usadas no texto, sem repetição. */
export function variaveisDoTemplate(template: string): string[] {
  return [...new Set([...template.matchAll(VARIAVEL_VALIDA)].map((m) => m[1]))];
}

/**
 * Confere as chaves {{ }} de um campo de texto: todas precisam ser variáveis bem formadas (letras, números e _)
 * e nenhuma pode ser proibida. Devolve a mensagem de erro, ou null se estiver tudo certo.
 */
export function validarVariaveis(
  campo: string,
  template: string,
): string | null {
  const abertas = (template.match(/{{/g) ?? []).length;
  const validas = [...template.matchAll(VARIAVEL_VALIDA)].length;
  if (abertas !== validas || (template.match(/}}/g) ?? []).length !== validas) {
    return `O campo "${campo}" tem uma variável mal formada. Use o formato {{nome}}, só com letras, números e _.`;
  }
  const proibida = variaveisDoTemplate(template).find((v) =>
    VARIAVEIS_PROIBIDAS.includes(v),
  );
  if (proibida)
    return `O campo "${campo}" não pode usar a variável {{${proibida}}}.`;
  return null;
}

/** Barra HTML que executa código ou carrega conteúdo externo. Devolve a mensagem de erro, ou null. */
export function validarHtml(html: string): string | null {
  const achado = PADROES_HTML_PERIGOSOS.find(({ padrao }) => padrao.test(html));
  return achado ? `O HTML do modelo não pode conter ${achado.motivo}.` : null;
}
