// Cada linha de `sessao` já É um login (uma sessão nasce por login, ver AuthServiceLogin.emitirTokens): não
// precisou de tabela nova para ter histórico. Sem IP, de propósito: mesma decisão de UsuarioResponse (o IP
// nunca é exposto pela API).
export class UsuarioResponseLoginHistorico {
  logadoEm: Date;
}
