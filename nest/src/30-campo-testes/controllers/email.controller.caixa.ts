import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  EmailServiceCaixa,
  type EmailDaCaixa,
  type PreviaDoEmail,
} from '../service/email.service.caixa';

// Caixa de E-mails do Campo de Testes (T6). Qualquer conta vê os próprios e-mails (RLS); limpar exige notificacao_processar.
@Controller('campo-testes/email')
export class EmailControllerCaixa {
  constructor(private readonly service: EmailServiceCaixa) {}

  @Get()
  listar(): Promise<EmailDaCaixa[]> {
    return this.service.listar();
  }

  @Get(':idNotificacao')
  previa(
    @Param('idNotificacao', ParseIntPipe) idNotificacao: number,
  ): Promise<PreviaDoEmail> {
    return this.service.previa(idNotificacao);
  }

  // O único jeito de um e-mail sair da T6.
  @Delete()
  @HttpCode(204)
  async limpar(): Promise<void> {
    await this.service.limpar();
  }
}
