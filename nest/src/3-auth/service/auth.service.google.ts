import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  MENSAGEM_GOOGLE_EMAIL_NAO_VERIFICADO,
  MENSAGEM_GOOGLE_SEM_CONTA,
} from '../constants/auth.constants';
import { AuthRequestGoogle } from '../dto/request/auth.request-google';
import { AuthResponseLogin } from '../dto/response/auth.response-login';
import { entrarComGoogleNoBanco } from '../util/auth.util.entrar-com-google';
import { AuthServiceGoogleToken } from './auth.service.google-token';
import { AuthServiceLogin } from './auth.service.login';

// Login com Google (18-11-2026). Ordem:
//   1. confere o ID token (AuthServiceGoogleToken) e exige email_verified = true;
//   2. o banco decide a conta (entrar_com_google, 03): entra na já ligada, liga a do mesmo e-mail ou cria uma nova,
//      com o e-mail confirmado e sem senha;
//   3. as mesmas barreiras e a mesma sessão do login por senha (AuthServiceLogin): conta bloqueada ou suspensa
//      continua barrada. A conta nova volta com aceitePendente (RF-015) e só usa o sistema depois de aceitar o Termo
//      de Uso vigente, como qualquer conta com termo pendente.
@Injectable()
export class AuthServiceGoogle {
  constructor(
    private readonly database: DatabaseService,
    private readonly googleToken: AuthServiceGoogleToken,
    private readonly login: AuthServiceLogin,
  ) {}

  async executar(
    dto: AuthRequestGoogle,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthResponseLogin> {
    const dados = await this.googleToken.conferir(dto.credential);
    // Sem a confirmação do Google, o e-mail do token pode não ser da pessoa: entrar por ele abriria a conta de outra.
    if (!dados.emailVerificado) {
      throw new UnauthorizedException(MENSAGEM_GOOGLE_EMAIL_NAO_VERIFICADO);
    }

    const idUsuario = await entrarComGoogleNoBanco(
      this.database.getDb(),
      dados,
    );
    if (idUsuario === null) {
      throw new UnauthorizedException(MENSAGEM_GOOGLE_SEM_CONTA);
    }

    await this.login.barrarContaImpedida(idUsuario);
    return this.login.abrirSessao(idUsuario, ip, userAgent);
  }
}
