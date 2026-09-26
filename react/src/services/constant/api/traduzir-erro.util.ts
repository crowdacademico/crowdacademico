import { ErroHttp } from './http.util';

// Espelho, do lado do React, do postgres-exception.filter.ts (Nest): lá, o backend traduz erro de banco para
// HTTP com mensagem em PT-BR; aqui é onde isso finalmente chega à tela. Sem isto, toda tela reinventaria o
// próprio `catch`, e duas categorias de erro ficariam mal representadas:
//
// 1. Falha de REDE (backend fora do ar, sem internet, CORS bloqueado) nunca passa por `tratarResposta()`: o
// `fetch` rejeita antes de qualquer resposta HTTP existir. `erro.message` nesse caso é do NAVEGADOR, em inglês
// ("Failed to fetch"), e apareceria cru em `<p className="crud-erro">`.
// 2. 429 (rate limit, ver @nestjs/throttler em auth.module.ts): a mensagem padrão do Nest para isso não é
// escrita pensando no usuário final. Todo o resto (400/403/404/409...) já vem em PT-BR, específico e correto
// direto do backend (RAISE EXCEPTION com ERRCODE, ou UnauthorizedException com mensagem própria): não faz
// sentido sobrescrever o que já está certo.
//
// Uso: troque `setErro(erroRequisicao.message)` por `setErro(traduzirErro(erroRequisicao))` em qualquer
// `catch`/`.catch(...)`.
export function traduzirErro(erro: unknown): string {
  if (!(erro instanceof ErroHttp)) {
    return 'Não foi possível falar com o servidor. Verifique sua internet e tente de novo.';
  }
  if (erro.status === 429) {
    return 'Muitas tentativas em pouco tempo, aguarde um instante e tente de novo.';
  }
  return erro.message || `Erro inesperado (HTTP ${erro.status}).`;
}
