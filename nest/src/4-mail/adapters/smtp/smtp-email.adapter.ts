import { createTransport, type Transporter } from 'nodemailer';
import {
  ErroEnvioEmail,
  type EnvioEmailPort,
  type MensagemEmail,
  type ResultadoEnvioEmail,
} from '../../ports/envio-email.port';
import type { Remetente } from '../remetente';

export interface ConfiguracaoSmtp {
  host: string;
  porta: number;
  seguro: boolean;
  usuario?: string;
  senha?: string;
}

// SMTP genérico (nodemailer): serve para o Gmail com senha de app (sem domínio próprio), para o MailHog ou o Mailpit no
// computador, e para qualquer provedor que fale SMTP. Atenção: redes de escola costumam bloquear as portas 587 e 465;
// nesse caso o envio falha por tempo esgotado e o Brevo (HTTPS) é o caminho. Ver .Tutorial-email.md.
export class SmtpEmailAdapter implements EnvioEmailPort {
  readonly provedor = 'smtp';
  readonly configurado = true;
  private readonly transporte: Transporter;

  constructor(
    config: ConfiguracaoSmtp,
    private readonly remetente: Remetente,
  ) {
    this.transporte = createTransport({
      host: config.host,
      port: config.porta,
      secure: config.seguro,
      auth: config.usuario
        ? { user: config.usuario, pass: config.senha }
        : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    });
  }

  async enviar(mensagem: MensagemEmail): Promise<ResultadoEnvioEmail> {
    try {
      const info = (await this.transporte.sendMail({
        from: { name: this.remetente.nome, address: this.remetente.email },
        to: mensagem.nomePara
          ? { name: mensagem.nomePara, address: mensagem.para }
          : mensagem.para,
        subject: mensagem.assunto,
        text: mensagem.texto,
        html: mensagem.html,
      })) as { messageId?: string };
      return { idMensagem: info.messageId ?? null };
    } catch (erro) {
      const codigo = (erro as { responseCode?: number }).responseCode;
      // 5xx do servidor de e-mail = recusa definitiva (endereço inexistente, autenticação errada); o resto (rede,
      // tempo esgotado, 4xx temporário) vale tentar de novo.
      const recuperavel = codigo === undefined || codigo < 500;
      throw new ErroEnvioEmail(
        `SMTP: ${erro instanceof Error ? erro.message : String(erro)}`,
        recuperavel,
      );
    }
  }
}
