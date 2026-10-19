import {
  ErroEnvioEmail,
  type EnvioEmailPort,
  type ResultadoEnvioEmail,
} from '../../ports/envio-email.port';

// Produção sem EMAIL_PROVIDER: o sistema sobe (login, campanhas e o resto continuam de pé), registra um erro no log e
// os e-mails ficam na fila, 'pendente', sem gastar tentativa, até alguém configurar o provedor. Mesmo raciocínio de
// GatewayNaoConfiguradoAdapter (23-pagamento).
export class EmailNaoConfiguradoAdapter implements EnvioEmailPort {
  readonly provedor = 'nao_configurado';
  readonly configurado = false;

  enviar(): Promise<ResultadoEnvioEmail> {
    return Promise.reject(
      new ErroEnvioEmail('Nenhum provedor de e-mail configurado.', true),
    );
  }
}
