import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthRequestForgotPassword } from '../dto/request/auth.request-forgot-password';
import { AuthServiceForgotPassword } from '../service/auth.service.forgot-password';
import { Publico } from '../../commons/auth/publico.decorator';

// Público (quem esqueceu a senha não tem sessão). Mesmo limite de pedidos de login e cadastro: endpoint aberto
// que, quando o e-mail existir, dispararia mensagens para qualquer endereço.
@Controller('auth')
export class AuthControllerForgotPassword {
  constructor(private readonly service: AuthServiceForgotPassword) {}

  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 30,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Post('esqueci-senha')
  @Publico()
  pedir(@Body() dto: AuthRequestForgotPassword) {
    return this.service.executar(dto.email);
  }
}
