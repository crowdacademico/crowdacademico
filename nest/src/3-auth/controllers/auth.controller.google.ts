import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { Publico } from '../../commons/auth/publico.decorator';
import { AuthRequestGoogle } from '../dto/request/auth.request-google';
import { AuthServiceGoogle } from '../service/auth.service.google';

@Controller('auth')
export class AuthControllerGoogle {
  constructor(private readonly service: AuthServiceGoogle) {}

  // Mesmo limite por IP do POST /auth/login (ver o comentário de lá): rota pública que abre sessão e consulta o Google.
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 30,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Post('google')
  @Publico()
  entrar(@Body() dto: AuthRequestGoogle, @Req() request: Request) {
    return this.service.executar(
      dto,
      request.ip ?? request.socket.remoteAddress,
      request.headers['user-agent'],
    );
  }
}
