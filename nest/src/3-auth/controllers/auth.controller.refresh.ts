import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthRequestRefreshToken } from '../dto/request/auth.request-refresh-token';
import { AuthServiceRefresh } from '../service/auth.service.refresh';

@Controller('auth')
export class AuthControllerRefresh {
  constructor(private readonly service: AuthServiceRefresh) {}

  @Post('refresh')
  refresh(@Body() dto: AuthRequestRefreshToken, @Req() request: Request) {
    return this.service.executar(
      dto,
      request.ip ?? request.socket.remoteAddress,
      request.headers['user-agent'],
    );
  }
}
