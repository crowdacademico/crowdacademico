import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthRequestLogin } from '../dto/request/auth.request-login';
import { AuthServiceLogin } from '../service/auth.service.login';

@Controller('auth')
export class AuthControllerLogin {
  constructor(private readonly service: AuthServiceLogin) {}

  // ThrottlerModule.forRoot (auth.module.ts) define o limite (5/60s por IP)
  // - só POST /auth/login usa o guard, de propósito: é o único endpoint
  // público que dispara bcrypt.compare (custoso de CPU) sem exigir login
  // nenhum antes. Ver comentário completo em auth.module.ts.
  @UseGuards(ThrottlerGuard)
  @Post('login')
  login(@Body() dto: AuthRequestLogin, @Req() request: Request) {
    return this.service.executar(
      dto,
      request.ip ?? request.socket.remoteAddress,
      request.headers['user-agent'],
    );
  }
}
