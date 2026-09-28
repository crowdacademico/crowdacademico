import { Body, Controller, Post } from '@nestjs/common';
import { AuthRequestVerifyEmail } from '../dto/request/auth.request-verify-email';
import { AuthServiceVerifyEmail } from '../service/auth.service.verify-email';
import { Publico } from '../../commons/auth/publico.decorator';

// Sem guard de propósito - o link chega por e-mail (futuro) ou, hoje, pelo
// tokenVerificacaoEmailDev devolvido no cadastro; quem clica pode não ter
// sessão nenhuma na aba. O token em si já é a autorização.
@Controller('auth')
export class AuthControllerVerifyEmail {
  constructor(private readonly service: AuthServiceVerifyEmail) {}

  @Post('verificar-email')
  @Publico()
  async verificar(@Body() dto: AuthRequestVerifyEmail) {
    await this.service.executar(dto.token);
    return { verificado: true };
  }
}
