import { Body, Controller, Post } from '@nestjs/common';
import { AuthRequestVerifyEmail } from '../dto/request/auth.request-verify-email';
import { AuthServiceVerificarEmail } from '../service/auth.service.verificar-email';

// Sem guard de propósito - o link chega por e-mail (futuro) ou, hoje, pelo
// tokenVerificacaoEmailDev devolvido no cadastro; quem clica pode não ter
// sessão nenhuma na aba. O token em si já é a autorização.
@Controller('auth')
export class AuthControllerVerificarEmail {
  constructor(private readonly service: AuthServiceVerificarEmail) {}

  @Post('verificar-email')
  async verificar(@Body() dto: AuthRequestVerifyEmail) {
    await this.service.executar(dto.token);
    return { verificado: true };
  }
}
