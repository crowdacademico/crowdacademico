import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from './usuario-autenticado.interface';

// Quem está logado, direto no parâmetro do controller (`@UsuarioAtual() usuario: UsuarioAutenticado`), em vez de
// receber o `request` inteiro só para ler `request.user!.idUsuario`. Só vale em rota protegida pelo
// RequireAuthGuard (é ele que preenche `request.user`); se faltar, responde 401 em vez de seguir com `undefined`.
export const UsuarioAtual = createParamDecorator(
  (_dado: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const { user } = contexto.switchToHttp().getRequest<Request>();
    if (!user) {
      throw new UnauthorizedException('É preciso estar logado.');
    }
    return user;
  },
);
