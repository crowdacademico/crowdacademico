import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

// Uso pontual (@UseGuards(RequireAuthGuard)), não global: bloqueia com 401
// direto quem chega sem sessão nenhuma, pra rotas que sempre exigem login —
// evita esperar a RLS devolver 0 linhas silenciosamente (UPDATE 0) só pra
// descobrir depois que faltava autenticação. Autorização por PERMISSÃO
// específica continua sendo responsabilidade da RLS (este guard não sabe
// nada sobre papel/permissao) — ver tem_permissao() em 03_funcoes_seguranca.sql.
@Injectable()
export class RequireAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new UnauthorizedException('Esta rota exige login.');
    }
    return true;
  }
}
