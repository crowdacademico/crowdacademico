// Compartilhado por todo services/*/api - mesma lógica de tratar resposta
// (erro HTTP -> Error com a mensagem do backend; corpo vazio -> undefined)
// em todo lugar que chama a API.
//
// CORRIGIDO (03-08-2026, achado do Lucas: "Unexpected end of JSON input" ao
// atribuir permissão): checar só `status === 204` não bastava. Endpoint que
// só cria um vínculo (sem nada útil pra devolver, ex.: POST /papel-
// permissao, POST /usuario-papel) volta com corpo vazio, mas o Nest manda
// 201 (padrão de POST), não 204 - `.json()` num corpo vazio quebra com
// exatamente essa mensagem. Ler como texto primeiro e só fazer JSON.parse
// se tiver algo cobre QUALQUER status com corpo vazio, não só 204 - não
// precisa lembrar de decorar cada endpoint futuro com @HttpCode(204).

// ErroHttp carrega o `status` HTTP junto da mensagem (achado de uma IA,
// 03-08-2026: o backend já categoriza erro em 4 faixas de HTTP pelo ERRCODE
// (postgres-exception.filter.ts), mas o React descartava o status e ficava
// só com o texto - sem status, `traduzir-erro.util.js` não tem como tratar
// 429/5xx/etc de forma diferente do resto). `instanceof Error` continua
// funcionando normalmente em todo `catch` existente.
export class ErroHttp extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = 'ErroHttp';
    this.status = status;
  }
}

// MIGRAÇÃO TS (06-09-2026) - fronteira de rede, uma das poucas do projeto
// onde `as` é permitido: `as` é proibido pra converter um valor cujo tipo
// o compilador já saberia deduzir, mas aqui o tipo é estruturalmente
// desconhecido - bytes crus da rede virando dado tipado, sem validação em
// runtime nenhuma no projeto. A garantia daqui pra frente é EXATAMENTE a
// mesma que já existia em JavaScript: confiança de que o backend manda o
// formato que promete. O compilador passa a confiar no que é afirmado
// nestas duas linhas - se o Nest mudar um DTO e `type/` (fase 2) não
// acompanhar, nada aqui avisa (fraqueza conhecida, ver
// ACHADOS_PARA_DISCUTIR.md).
//
// `T` sem valor padrão de propósito - esquecer de informar (ex.:
// `tratarResposta(resposta)` sem `<...>`) vira erro de compilação, não
// `any` silencioso. Endpoint que não devolve nada de útil (POST
// /papel-permissao, POST /usuario-papel) declara `tratarResposta<void>(...)`
// no ponto de uso - autodocumenta o corpo vazio, sem custo em nenhum outro
// lugar.
export async function tratarResposta<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    // `message` pode ser texto ou lista de textos - validação por DTO no
    // Nest (class-validator) devolve lista quando mais de uma regra falha
    // no mesmo campo. Comportamento atual (concatenar a lista virando
    // string) preservado exatamente: `new Error(array)` já fazia esse
    // join sozinho (vírgula, sem espaço) - aqui só ficou explícito.
    const corpo = (await resposta.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const mensagem = Array.isArray(corpo?.message) ? corpo.message.join(',') : corpo?.message;
    throw new ErroHttp(mensagem || `Erro HTTP ${resposta.status}`, resposta.status);
  }
  const texto = await resposta.text();
  return texto ? (JSON.parse(texto) as T) : (undefined as T);
}
