import { createHash, randomBytes } from 'crypto';

// Par (token em texto puro pro link, hash determinístico pra gravar) — SHA-256,
// não bcrypt: confirmar_email_por_token() (03_funcoes_seguranca.sql, [03-F])
// busca por IGUALDADE (`WHERE token_hash = p_token_hash`), o que só funciona
// com hash determinístico (bcrypt teria salt aleatório por chamada, nunca
// bateria igual duas vezes pro mesmo token). Função pura, mesmo espírito de
// refresh-token.util.ts — sem tocar banco, sem ser um service Nest.
export function gerarTokenVerificacaoEmail(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashTokenVerificacaoEmail(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
