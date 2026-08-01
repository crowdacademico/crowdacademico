import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RefreshTokenRequestDto } from '../dto/request/refresh-token.request.dto';
import { AuthServiceLogout } from '../service/auth.service.logout';

@Controller('auth')
export class AuthControllerLogout {
  constructor(private readonly service: AuthServiceLogout) {}

  @Post('logout')
  @HttpCode(204)
  logout(@Body() dto: RefreshTokenRequestDto) {
    return this.service.executar(dto);
  }
}
