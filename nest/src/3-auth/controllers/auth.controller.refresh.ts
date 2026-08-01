import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RefreshTokenRequestDto } from '../dto/request/refresh-token.request.dto';
import { AuthServiceRefresh } from '../service/auth.service.refresh';

@Controller('auth')
export class AuthControllerRefresh {
  constructor(private readonly service: AuthServiceRefresh) {}

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenRequestDto, @Req() request: Request) {
    return this.service.executar(
      dto,
      request.ip ?? request.socket.remoteAddress,
      request.headers['user-agent'],
    );
  }
}
