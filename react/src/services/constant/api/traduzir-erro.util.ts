import { ErroHttp } from './http.util';

// Espelho, do lado do React, do postgres-exception.filter.ts (Nest): lá, o backend traduz erro de banco para
// HTTP com mensagem em PT-BR; aqui é onde isso finalmente chega à tela. O único caso que o backend não cobre é
// a falha de REDE (backend fora do ar, sem internet, CORS bloqueado): o `fetch` rejeita antes de qualquer
// resposta HTTP existir, e `erro.message` é do NAVEGADOR, em inglês ("Failed to fetch"). Todo o resto
// (400/403/404/409/429...) já vem em PT-BR e específico do backend, inclusive o 429 com o tempo de espera
// (nest/src/commons/seguranca/mensagem-limite-tentativas.util.ts): não faz sentido sobrescrever.
//
// Uso: troque `setErro(erroRequisicao.message)` por `setErro(traduzirErro(erroRequisicao))` em qualquer
// `catch`/`.catch(...)`.
export function traduzirErro(erro: unknown): string {
  if (!(erro instanceof ErroHttp)) {
    return 'Não foi possível falar com o servidor. Verifique sua internet e tente de novo.';
  }
  return erro.message || `Erro inesperado (HTTP ${erro.status}).`;
}
