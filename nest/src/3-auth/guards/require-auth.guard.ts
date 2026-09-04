import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

// Uso pontual (@UseGuards(RequireAuthGuard)), não global: bloqueia com 401
// direto quem chega sem sessão nenhuma, pra rotas que sempre exigem login -
// evita esperar a RLS devolver 0 linhas silenciosamente (UPDATE 0) só pra
// descobrir depois que faltava autenticação. Autorização por PERMISSÃO
// específica continua sendo responsabilidade da RLS (este guard não sabe
// nada sobre papel/permissao) - ver tem_permissao() em 03_funcoes_seguranca.sql.
@Injectable()
export class RequireAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      // Mensagem melhorada (07-08-2026, pedido do Lucas): "Esta rota exige
      // login." estava tecnicamente certo mas não dizia o que fazer. Este
      // guard só confere SE existe sessão, não qual permissão ela tem
      // (isso é RLS, ver comentário acima) - por isso a mensagem fala em
      // "logado", não em "administrador": quem já está logado mas sem a
      // permissão certa nunca cai aqui, cai num 403 vindo da RLS.
      throw new UnauthorizedException(
        'Você precisa estar logado para fazer isso.',
      );
    }
    return true;
  }
}
