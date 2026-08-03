// Compartilhado por todo services/*/api — mesma lógica de tratar resposta
// (erro HTTP -> Error com a mensagem do backend; corpo vazio -> undefined)
// em todo lugar que chama a API.
//
// CORRIGIDO (03-08-2026, achado do Lucas: "Unexpected end of JSON input" ao
// atribuir permissão): checar só `status === 204` não bastava. Endpoint que
// só cria um vínculo (sem nada útil pra devolver, ex.: POST /papel-
// permissao, POST /usuario-papel) volta com corpo vazio, mas o Nest manda
// 201 (padrão de POST), não 204 — `.json()` num corpo vazio quebra com
// exatamente essa mensagem. Ler como texto primeiro e só fazer JSON.parse
// se tiver algo cobre QUALQUER status com corpo vazio, não só 204 — não
// precisa lembrar de decorar cada endpoint futuro com @HttpCode(204).

// ErroHttp carrega o `status` HTTP junto da mensagem (achado do Claude Web,
// 03-08-2026: o backend já categoriza erro em 4 faixas de HTTP pelo ERRCODE
// (postgres-exception.filter.ts), mas o React descartava o status e ficava
// só com o texto — sem status, `traduzir-erro.util.js` não tem como tratar
// 429/5xx/etc de forma diferente do resto). `instanceof Error` continua
// funcionando normalmente em todo `catch` existente.
export class ErroHttp extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.name = 'ErroHttp';
    this.status = status;
  }
}

export async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new ErroHttp(corpo?.message || `Erro HTTP ${resposta.status}`, resposta.status);
  }
  const texto = await resposta.text();
  return texto ? JSON.parse(texto) : undefined;
}
