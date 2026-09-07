import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthRequestRegister } from '../dto/request/auth.request-register';
import { AuthServiceCadastro } from '../service/auth.service.cadastro';

@Controller('auth')
export class AuthControllerCadastro {
  constructor(private readonly service: AuthServiceCadastro) {}

  // ThrottlerGuard aqui pelo mesmo motivo de POST /auth/login (ver
  // auth.controller.login.ts): bcrypt.hash é custoso de CPU, e criar conta é
  // o tipo de endpoint público que atrai spam/automação sem exigir NADA
  // antes (nem uma conta válida). Mesmos números de login (5/60s produção,
  // 30/60s dev) - mesma categoria de endpoint, mesmo motivo.
  //
  // CORRIGIDO (07-09-2026, mesmo achado do login - ver comentário completo
  // em auth.controller.login.ts): também dependia só do default do módulo,
  // nunca declarado aqui - mesmo risco de ficar à mercê de outro
  // `forRoot()` no processo. Agora declara o próprio `@Throttle()`.
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 30,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Post('cadastro')
  cadastro(@Body() dto: AuthRequestRegister, @Req() request: Request) {
    return this.service.executar(
      dto,
      request.ip ?? request.socket.remoteAddress,
      request.headers['user-agent'],
    );
  }
}
