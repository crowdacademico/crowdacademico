import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AuthServiceResendVerification } from '../service/auth.service.resend-verification';

@Controller('auth')
export class AuthControllerResendVerification {
  constructor(private readonly service: AuthServiceResendVerification) {}

  @Post('reenviar-verificacao/:idUsuario')
  @HttpCode(204)
  reenviar(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.executar(idUsuario);
  }
}
