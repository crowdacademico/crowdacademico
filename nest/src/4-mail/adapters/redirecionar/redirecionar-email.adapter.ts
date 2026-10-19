import type {
  EnvioEmailPort,
  MensagemEmail,
  ResultadoEnvioEmail,
} from '../../ports/envio-email.port';

// Trava de ambiente de teste: com um provedor de verdade FORA de produção, todo e-mail vai para EMAIL_REDIRECIONAR_PARA,
// com o destinatário original no assunto. O seed de demonstração tem endereços com domínio real (usp.br, gmail.com):
// sem esta trava, testar o Brevo no computador mandaria e-mail para pessoas que podem existir. Padrão de mercado em
// homologação ("mail redirect" / "catch-all").
export class RedirecionarEmailAdapter implements EnvioEmailPort {
  readonly provedor: string;
  readonly configurado = true;

  constructor(
    private readonly real: EnvioEmailPort,
    private readonly destino: string,
  ) {
    this.provedor = real.provedor;
  }

  enviar(mensagem: MensagemEmail): Promise<ResultadoEnvioEmail> {
    return this.real.enviar({
      ...mensagem,
      para: this.destino,
      nomePara: undefined,
      assunto: `[teste, para ${mensagem.para}] ${mensagem.assunto}`,
    });
  }
}
