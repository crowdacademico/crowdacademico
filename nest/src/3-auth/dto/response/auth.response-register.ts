import { AuthResponseLogin } from './auth.response-login';

export class AuthResponseRegister extends AuthResponseLogin {
  // Só preenchido fora de produção (NODE_ENV !== 'production'): o mesmo token que vai no link do e-mail.
  // Existe para testar a verificação sem abrir a caixa de entrada.
  tokenVerificacaoEmailDev: string | null;
}
