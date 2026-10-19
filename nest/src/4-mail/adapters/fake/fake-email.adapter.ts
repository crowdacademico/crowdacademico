import type {
  EnvioEmailPort,
  MensagemEmail,
  ResultadoEnvioEmail,
} from '../../ports/envio-email.port';

export interface EmailCapturado extends MensagemEmail {
  idMensagem: string;
  enviadoEm: Date;
}

const LIMITE_CAIXA = 200;

// Provedor de teste: não manda nada para fora. Guarda os últimos e-mails na memória do Nest, e a caixa de entrada do
// Campo de Testes mostra (GET /campo-testes/email). Some ao reiniciar o Nest, de propósito: é só para ver na hora.
// Proibido em produção (email.module.ts).
export class FakeEmailAdapter implements EnvioEmailPort {
  readonly provedor = 'fake';
  readonly configurado = true;
  private readonly caixa: EmailCapturado[] = [];
  private contador = 0;

  enviar(mensagem: MensagemEmail): Promise<ResultadoEnvioEmail> {
    this.contador++;
    const idMensagem = `fake-${this.contador}`;
    this.caixa.unshift({ ...mensagem, idMensagem, enviadoEm: new Date() });
    this.caixa.splice(LIMITE_CAIXA);
    return Promise.resolve({ idMensagem });
  }

  listar(): EmailCapturado[] {
    return [...this.caixa];
  }

  limpar(): void {
    this.caixa.length = 0;
  }
}
