import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import {
  INTERVALO_TAREFA_MINUTOS,
  TAREFA_AUTOMATICA,
  cronACada,
  tarefaLigada,
} from '../../commons/agendamento/tarefa-automatica';
import { PG_POOL } from '../../commons/database/database.constants';
import { decifrarSegredoEmail } from '../../commons/seguranca/segredo-email-cifra.util';
import { CHAVE_SEGREDO_NOTIFICACAO } from '../../27-notificacao/constants/notificacao.constants';
import { URL_PAINEL_PADRAO } from '../email.config';
import { montarHtml, montarTexto } from '../modelos/layout-email';
import { montarConteudo } from '../modelos/modelos-email';
import {
  ENVIO_EMAIL,
  ErroEnvioEmail,
  type EnvioEmailPort,
} from '../ports/envio-email.port';

interface LinhaNotificacao {
  id_notificacao: number;
  email_destinatario: string;
  tipo_evento: string;
  dados: Record<string, unknown>;
}

const LOTE_MAXIMO = 20;

// Worker de e-mail: esvazia a fila de notificacao ([05-Q]). Um e-mail por vez: reserva no banco (transação curta, sem
// segurar nada aberto durante o envio), monta o texto, manda pelo provedor e grava o resultado. Se o processo morrer no
// meio, a reserva vence (email_lease_minutos) e outro ciclo retoma. Mesmo desenho do worker de repasse (23-pagamento).
//
// `PG_POOL` direto, nunca DatabaseService.getDb(): job agendado roda fora do pipeline HTTP. O link com token só é
// decifrado na hora de montar o e-mail e nunca vai para log.
@Injectable()
export class EmailServiceSendPending {
  private readonly logger = new Logger(EmailServiceSendPending.name);
  private emExecucao = false;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(ENVIO_EMAIL) private readonly envio: EnvioEmailPort,
    private readonly config: ConfigService,
  ) {}

  // Agendada: só roda com o interruptor ligado (tarefa_envio_email_ligada). "Rodar agora" do Campo de Testes chama
  // executar() direto.
  @Cron(cronACada(INTERVALO_TAREFA_MINUTOS.envioEmail))
  async aoAgendar(): Promise<void> {
    if (
      await tarefaLigada(this.pool, TAREFA_AUTOMATICA.envioEmail, this.logger)
    ) {
      await this.executar();
    }
  }

  async executar(): Promise<number> {
    if (this.emExecucao || !this.envio.configurado) return 0;
    this.emExecucao = true;
    let tratados = 0;
    try {
      while (tratados < LOTE_MAXIMO && (await this.enviarProximo())) {
        tratados++;
      }
      if (tratados > 0) {
        this.logger.log(`${tratados} e-mail(s) tratado(s) neste ciclo.`);
      }
    } catch (erro) {
      this.logger.error(
        `Falha no worker de e-mail: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    } finally {
      this.emExecucao = false;
    }
    return tratados;
  }

  // false = fila vazia; true = tratou um (enviado, ou falha registrada).
  private async enviarProximo(): Promise<boolean> {
    const fila = await this.pool.query<LinhaNotificacao>(
      'SELECT * FROM public.reservar_proxima_notificacao()',
    );
    const item = fila.rows[0] as LinhaNotificacao | undefined;
    if (!item) return false;

    const conteudo = montarConteudo(item.tipo_evento, {
      dados: item.dados,
      urlPainel: (
        this.config.get<string>('PAINEL_URL') ?? URL_PAINEL_PADRAO
      ).replace(/\/+$/, ''),
      segredo: this.decifrar(item.dados[CHAVE_SEGREDO_NOTIFICACAO]),
    });
    if (!conteudo) {
      await this.falhar(
        item,
        null,
        new ErroEnvioEmail(
          `Sem texto para o tipo "${item.tipo_evento}" (ou falta o link que ele exige).`,
          false,
        ),
      );
      return true;
    }

    try {
      const resultado = await this.envio.enviar({
        para: item.email_destinatario,
        nomePara:
          typeof item.dados.nome === 'string' ? item.dados.nome : undefined,
        assunto: conteudo.assunto,
        texto: montarTexto(conteudo),
        html: montarHtml(conteudo),
      });
      await this.pool.query(
        'SELECT public.concluir_notificacao($1::int, $2::varchar, $3::varchar, $4::varchar)',
        [
          item.id_notificacao,
          conteudo.assunto,
          this.envio.provedor,
          resultado.idMensagem,
        ],
      );
    } catch (erro) {
      await this.falhar(
        item,
        conteudo.assunto,
        erro instanceof ErroEnvioEmail
          ? erro
          : new ErroEnvioEmail(
              erro instanceof Error ? erro.message : String(erro),
              true,
            ),
      );
    }
    return true;
  }

  private async falhar(
    item: LinhaNotificacao,
    assunto: string | null,
    erro: ErroEnvioEmail,
  ): Promise<void> {
    const decisao = await this.pool.query<{ r: string }>(
      'SELECT public.falhar_notificacao($1::int, $2::varchar, $3::text, $4::boolean, $5::varchar) AS r',
      [
        item.id_notificacao,
        assunto,
        erro.message,
        erro.recuperavel,
        this.envio.provedor,
      ],
    );
    this.logger.warn(
      `E-mail ${item.id_notificacao} (${item.tipo_evento}) não saiu: ${erro.message}; ficou ${decisao.rows[0]?.r ?? '?'}.`,
    );
  }

  private decifrar(valor: unknown): string | null {
    if (typeof valor !== 'string' || valor === '') return null;
    try {
      return decifrarSegredoEmail(valor);
    } catch {
      return null;
    }
  }
}
