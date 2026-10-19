import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { BrevoEmailAdapter } from './adapters/brevo/brevo-email.adapter';
import { FakeEmailAdapter } from './adapters/fake/fake-email.adapter';
import { EmailNaoConfiguradoAdapter } from './adapters/nao-configurado/email-nao-configurado.adapter';
import { RedirecionarEmailAdapter } from './adapters/redirecionar/redirecionar-email.adapter';
import type { Remetente } from './adapters/remetente';
import { SmtpEmailAdapter } from './adapters/smtp/smtp-email.adapter';
import type { EnvioEmailPort } from './ports/envio-email.port';

// Escolhe o provedor pela variável EMAIL_PROVIDER ('fake' | 'brevo' | 'smtp'). Mesmas regras de PAYMENT_PROVIDER:
//  - ausente em desenvolvimento => 'fake' (subir o projeto sem configurar nada continua funcionando);
//  - ausente em PRODUÇÃO => o sistema sobe, com erro no log, e os e-mails esperam na fila;
//  - 'fake' em PRODUÇÃO => o boot FALHA (diria "enviado" para e-mail que ninguém recebeu);
//  - 'brevo' ou 'smtp' FORA de produção => exige EMAIL_REDIRECIONAR_PARA, ou o boot falha: o seed tem endereços com
//    domínio real, e um teste no computador não pode escrever para eles.
// Configuração incompleta de um provedor escolhido faz o boot falhar com a lista do que falta (.Tutorial-email.md).
export function criarAdapterEmail(
  config: Pick<ConfigService, 'get'>,
  logger: Pick<Logger, 'error'> = new Logger('EmailModule'),
): EnvioEmailPort {
  const emProducao = config.get<string>('NODE_ENV') === 'production';
  const provedor =
    config.get<string>('EMAIL_PROVIDER') ?? (emProducao ? undefined : 'fake');

  if (provedor === undefined) {
    logger.error(
      'EMAIL_PROVIDER não definido em produção: os e-mails ficam na fila sem sair. Defina o provedor (ex.: "brevo").',
    );
    return new EmailNaoConfiguradoAdapter();
  }
  if (provedor === 'fake') {
    if (emProducao) {
      throw new Error(
        'EMAIL_PROVIDER=fake não pode ser usado em produção: o e-mail apareceria como enviado sem ninguém receber.',
      );
    }
    return new FakeEmailAdapter();
  }

  const faltando: string[] = [];
  const ler = (chave: string): string => {
    const valor = config.get<string>(chave)?.trim() ?? '';
    if (!valor) faltando.push(chave);
    return valor;
  };
  const remetente: Remetente = {
    email: ler('EMAIL_REMETENTE'),
    nome:
      config.get<string>('EMAIL_REMETENTE_NOME')?.trim() || 'CrowdAcadêmico',
  };

  let real: EnvioEmailPort;
  switch (provedor) {
    case 'brevo':
      real = new BrevoEmailAdapter(ler('BREVO_API_KEY'), remetente);
      break;
    case 'smtp':
      real = new SmtpEmailAdapter(
        {
          host: ler('SMTP_HOST'),
          porta: Number(config.get<string>('SMTP_PORTA') ?? 587),
          seguro: config.get<string>('SMTP_SEGURO') === 'true',
          usuario: config.get<string>('SMTP_USUARIO') || undefined,
          senha: config.get<string>('SMTP_SENHA') || undefined,
        },
        remetente,
      );
      break;
    default:
      throw new Error(
        `EMAIL_PROVIDER desconhecido: "${provedor}". Valores aceitos: fake, brevo, smtp.`,
      );
  }

  const redirecionar = config.get<string>('EMAIL_REDIRECIONAR_PARA')?.trim();
  if (!emProducao && !redirecionar) faltando.push('EMAIL_REDIRECIONAR_PARA');
  if (faltando.length > 0) {
    throw new Error(
      `Configuração de e-mail incompleta (EMAIL_PROVIDER=${provedor}): falta ${faltando.join(', ')}. Ver .Tutorial-email.md.`,
    );
  }
  return redirecionar ? new RedirecionarEmailAdapter(real, redirecionar) : real;
}
