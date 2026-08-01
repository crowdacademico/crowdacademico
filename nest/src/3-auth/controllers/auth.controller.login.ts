import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LoginRequestDto } from '../dto/request/login.request.dto';
import { AuthServiceLogin } from '../service/auth.service.login';

@Controller('auth')
export class AuthControllerLogin {
  constructor(private readonly service: AuthServiceLogin) {}

  @Post('login')
  login(@Body() dto: LoginRequestDto, @Req() request: Request) {
    return this.service.executar(
      dto,
      request.ip ?? request.socket.remoteAddress,
      request.headers['user-agent'],
    );
  }
}
