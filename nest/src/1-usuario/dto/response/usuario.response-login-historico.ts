// Cada linha de `sessao` já É um login (uma sessão nasce por login, ver
// AuthServiceLogin.emitirTokens) — não precisou de tabela nova nenhuma pra
// ter histórico, só consultar o que já existe. Sem IP de propósito: mesma
// decisão de UsuarioResponseDto (07-08-2026), o IP continua nunca exposto
// pela API.
export class LoginHistoricoResponseDto {
  logadoEm: Date;
}
