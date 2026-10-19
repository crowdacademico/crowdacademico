import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { criarAdapterEmail } from './email.config';
import { ENVIO_EMAIL } from './ports/envio-email.port';
import { EmailServiceSendPending } from './service/email.service.send-pending';

// O "carteiro": lê a fila de notificacao e entrega pelo provedor escolhido em EMAIL_PROVIDER (email.config.ts). Sem
// tela: o que foi enviado, o que falhou e o reenvio ficam em 27-notificacao (aba Notificações do Dashboard). Trocar de
// provedor = um adapter novo implementando EnvioEmailPort e um case em criarAdapterEmail; nenhum consumidor muda.
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ENVIO_EMAIL,
      inject: [ConfigService],
      useFactory: criarAdapterEmail,
    },
    EmailServiceSendPending,
  ],
  // Para o Campo de Testes: a caixa de entrada do provedor de teste e o "Rodar agora".
  exports: [ENVIO_EMAIL, EmailServiceSendPending],
})
export class EmailModule {}
