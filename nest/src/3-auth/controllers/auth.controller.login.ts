import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { LoginRequestDto } from '../dto/request/login.request.dto';
import { AuthServiceLogin } from '../service/auth.service.login';

@Controller('auth')
export class AuthControllerLogin {
  constructor(private readonly service: AuthServiceLogin) {}

  // ThrottlerModule.forRoot (auth.module.ts) define o limite (5/60s por IP)
  // — só POST /auth/login usa o guard, de propósito: é o único endpoint
  // público que dispara bcrypt.compare (custoso de CPU) sem exigir login
  // nenhum antes. Ver comentário completo em auth.module.ts.
  @UseGuards(ThrottlerGuard)
  @Post('login')
  login(@Body() dto: LoginRequestDto, @Req() request: Request) {
    return this.service.executar(
      dto,
      request.ip ?? request.socket.remoteAddress,
      request.headers['user-agent'],
    );
  }
}
