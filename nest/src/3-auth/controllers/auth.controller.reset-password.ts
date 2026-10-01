import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthRequestResetPassword } from '../dto/request/auth.request-reset-password';
import { AuthServiceResetPassword } from '../service/auth.service.reset-password';
import { Publico } from '../../commons/auth/publico.decorator';

// Público: o token do link é a autorização (mesmo raciocínio de POST /auth/verificar-email).
@Controller('auth')
export class AuthControllerResetPassword {
  constructor(private readonly service: AuthServiceResetPassword) {}

  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 30,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Post('redefinir-senha')
  @Publico()
  async redefinir(@Body() dto: AuthRequestResetPassword) {
    await this.service.executar(dto.token, dto.senha);
    return { redefinida: true };
  }
}
