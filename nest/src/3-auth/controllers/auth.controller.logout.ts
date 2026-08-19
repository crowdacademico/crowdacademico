import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthRequestRefreshToken } from '../dto/request/auth.request-refresh-token';
import { AuthServiceLogout } from '../service/auth.service.logout';

@Controller('auth')
export class AuthControllerLogout {
  constructor(private readonly service: AuthServiceLogout) {}

  @Post('logout')
  @HttpCode(204)
  logout(@Body() dto: AuthRequestRefreshToken) {
    return this.service.executar(dto);
  }
}
