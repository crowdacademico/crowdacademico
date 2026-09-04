import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// Guard GLOBAL (registrado como APP_GUARD em auth.module.ts) - roda em TODA
// rota, autenticada ou não. Não bloqueia rota nenhuma por conta própria: só
// resolve `request.user` quando existe um Bearer token válido. Rota sem
// token nenhum passa como anônima (request.user fica undefined) - quem
// decide se isso é permitido é a RLS do banco (ou, pra rotas que exigem
// login de qualquer forma, o RequireAuthGuard, aplicado rota a rota).
//
// Roda ANTES do GlobalDbInterceptor (guards → interceptors, nessa ordem, no
// pipeline do Nest) - é assim que o interceptor já encontra request.user
// resolvido quando abre a transação e seta app.id_usuario_atual.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const cabecalho = request.headers['authorization'];

    if (!cabecalho) {
      return true;
    }

    const [esquema, token] = cabecalho.split(' ');
    if (esquema !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Cabeçalho Authorization mal formado (esperado "Bearer <token>").',
      );
    }

    try {
      const payload = this.jwtService.verify<{ sub: number; sid: number }>(
        token,
      );
      request.user = { idUsuario: payload.sub, idSessao: payload.sid };
      return true;
    } catch {
      // Token presente mas inválido/expirado - diferente de "sem token" (que
      // é anônimo válido), isso é sempre erro: cliente pensa que está
      // autenticado e não está.
      throw new UnauthorizedException('Token de acesso inválido ou expirado.');
    }
  }
}
