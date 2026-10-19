// A "tomada" do e-mail: o sistema só conhece esta interface; quem fala com o provedor (Brevo, SMTP, o de teste) é o
// adapter escolhido em email.module.ts. Mesmo desenho de 23-pagamento/ports. Token de injeção contra a interface.
export const ENVIO_EMAIL = 'ENVIO_EMAIL';

export interface MensagemEmail {
  para: string;
  nomePara?: string;
  assunto: string;
  texto: string;
  html: string;
}

export interface ResultadoEnvioEmail {
  // Id da mensagem no provedor (para achar o e-mail no painel dele); null quando o provedor não devolve.
  idMensagem: string | null;
}

export interface EnvioEmailPort {
  // Nome curto ('fake', 'brevo', 'smtp'): vai para notificacao.provedor.
  readonly provedor: string;
  // false = nada configurado: o worker nem reserva e-mail da fila (eles esperam, sem gastar tentativa).
  readonly configurado: boolean;
  enviar(mensagem: MensagemEmail): Promise<ResultadoEnvioEmail>;
}

// Toda falha de envio sai como este erro. recuperavel = vale tentar de novo mais tarde (rede, provedor fora do ar,
// limite por minuto); não recuperável = tentar de novo dá o mesmo resultado (endereço recusado, chave errada).
export class ErroEnvioEmail extends Error {
  constructor(
    mensagem: string,
    readonly recuperavel: boolean,
  ) {
    super(mensagem);
  }
}
