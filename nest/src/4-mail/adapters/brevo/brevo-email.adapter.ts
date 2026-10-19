import {
  ErroEnvioEmail,
  type EnvioEmailPort,
  type MensagemEmail,
  type ResultadoEnvioEmail,
} from '../../ports/envio-email.port';
import type { Remetente } from '../remetente';

const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';
const TIMEOUT_MS = 15_000;

// Brevo pela API HTTP (porta 443, a mesma dos sites): não depende das portas do SMTP (587/465), que redes de escola e
// alguns servidores bloqueiam. Documentação: developers.brevo.com, "Send a transactional email". A chave fica em
// BREVO_API_KEY e nunca vai para log. Ver .Tutorial-email.md.
export class BrevoEmailAdapter implements EnvioEmailPort {
  readonly provedor = 'brevo';
  readonly configurado = true;

  constructor(
    private readonly chaveApi: string,
    private readonly remetente: Remetente,
  ) {}

  async enviar(mensagem: MensagemEmail): Promise<ResultadoEnvioEmail> {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TIMEOUT_MS);
    let resposta: Response;
    try {
      resposta = await fetch(URL_BREVO, {
        method: 'POST',
        signal: controle.signal,
        headers: {
          'api-key': this.chaveApi,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { email: this.remetente.email, name: this.remetente.nome },
          to: [{ email: mensagem.para, name: mensagem.nomePara }],
          subject: mensagem.assunto,
          htmlContent: mensagem.html,
          textContent: mensagem.texto,
        }),
      });
    } catch (erro) {
      throw new ErroEnvioEmail(
        `Sem resposta do Brevo: ${erro instanceof Error ? erro.message : String(erro)}`,
        true,
      );
    } finally {
      clearTimeout(relogio);
    }

    if (resposta.ok) {
      const corpo = (await resposta.json().catch(() => ({}))) as {
        messageId?: string;
      };
      return { idMensagem: corpo.messageId ?? null };
    }

    const detalhe = await resposta.text().catch(() => '');
    // 429 (limite por minuto) e 5xx (instabilidade): vale tentar de novo. 400, 401, 403: tentar de novo dá o mesmo.
    const recuperavel = resposta.status === 429 || resposta.status >= 500;
    throw new ErroEnvioEmail(
      `Brevo recusou (${resposta.status}): ${detalhe.slice(0, 300)}`,
      recuperavel,
    );
  }
}
