import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CHAVE_ROTA_PUBLICA } from '../../commons/auth/publico.decorator';

// Global (APP_GUARD em auth.module.ts, depois da AuthGuardJwt): toda rota exige login, menos as marcadas com
// @Publico(). Rota nova nasce fechada; esquecer a marcação deixa a rota fechada, nunca aberta. Bloqueia com 401
// quem chega sem sessão, em vez de esperar a RLS devolver 0 linhas em silêncio. Autorização por PERMISSÃO
// continua sendo da RLS (este guard não sabe nada de papel/permissão), ver tem_permissao() em
// 03_funcoes_seguranca.sql.
@Injectable()
export class AuthGuardRequireAuth implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const publica = this.reflector.getAllAndOverride<boolean>(
      CHAVE_ROTA_PUBLICA,
      [context.getHandler(), context.getClass()],
    );
    if (publica) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      // A mensagem fala em "logado", não em "administrador": quem já está logado mas sem a permissão certa nunca
      // cai aqui, cai num 403 vindo da RLS.
      throw new UnauthorizedException(
        'Você precisa estar logado para fazer isso.',
      );
    }
    return true;
  }
}
