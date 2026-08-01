// Compartilhado por todo services/*/api — mesma lógica de tratar resposta
// (erro HTTP -> Error com a mensagem do backend; 204 -> undefined) em todo
// lugar que chama a API.
export async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new Error(corpo?.message || `Erro HTTP ${resposta.status}`);
  }
  if (resposta.status === 204) {
    return undefined;
  }
  return resposta.json();
}
