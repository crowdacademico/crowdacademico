import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { MENSAGEM_GOOGLE_TOKEN_INVALIDO } from '../constants/auth.constants';

// O que o login usa do ID token do Google. LGPD: só isto sai daqui (sem foto, sem idioma, sem domínio).
export interface DadosContaGoogle {
  sub: string;
  email: string;
  emailVerificado: boolean;
  nome: string | null;
}

// Confere o ID token (o "credential" do botão do Google Identity Services): assinatura com as chaves públicas do
// Google, emissor, validade e audience = GOOGLE_CLIENT_ID. Não usa a chave secreta do cliente: o fluxo do botão não
// troca código por token, então ela não é necessária. Classe própria para os testes trocarem o Google por um falso.
@Injectable()
export class AuthServiceGoogleToken {
  private readonly idCliente: string | undefined;
  private readonly cliente = new OAuth2Client();

  constructor(config: ConfigService) {
    this.idCliente =
      config.get<string>('GOOGLE_CLIENT_ID')?.trim() || undefined;
  }

  async conferir(credential: string): Promise<DadosContaGoogle> {
    // Sem a variável, o login com Google não existe (a tela também não mostra o botão).
    if (!this.idCliente) {
      throw new ServiceUnavailableException(
        'O login com Google não está disponível.',
      );
    }
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.cliente.verifyIdToken({
        idToken: credential,
        audience: this.idCliente,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException(MENSAGEM_GOOGLE_TOKEN_INVALIDO);
    }
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException(MENSAGEM_GOOGLE_TOKEN_INVALIDO);
    }
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerificado: payload.email_verified === true,
      nome: payload.name ?? null,
    };
  }
}
