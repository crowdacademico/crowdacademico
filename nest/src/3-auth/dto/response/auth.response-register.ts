import { AuthResponseLogin } from './auth.response-login';

export class AuthResponseRegister extends AuthResponseLogin {
  // Só preenchido fora de produção (NODE_ENV !== 'production') — mesmo
  // token que vai (vai ir, quando 4-mail existir) por e-mail de verdade.
  // Existe pra deixar o fluxo de verificação testável HOJE, sem fingir que
  // um e-mail foi enviado (ver comentário completo em auth.service.cadastro.ts).
  tokenVerificacaoEmailDev: string | null;
}
