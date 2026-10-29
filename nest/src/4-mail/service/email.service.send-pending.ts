import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import {
  TAREFA_AUTOMATICA,
  tarefaLigada,
} from '../../commons/agendamento/tarefa-automatica';
import { PG_POOL } from '../../commons/database/database.constants';
import { montarMensagemBanco, type MensagemMontada } from '../modelos/montar-mensagem-banco';
import {
  ENVIO_EMAIL,
  ErroEnvioEmail,
  type EnvioEmailPort,
} from '../ports/envio-email.port';

interface LinhaNotificacao {
  id_notificacao: number;
  id_usuario: number | null;
  email_destinatario: string;
  tipo_evento: string;
  dados: Record<string, unknown>;
  // Versão do modelo de e-mail vigente quando o evento aconteceu (NULL só em linhas antigas).
  id_modelo_mensagem: number | null;
}

const INTERVALO_PADRAO_MINUTOS = 1;
const LOTE_PADRAO = 20;
const INTERVALO_MAXIMO_MINUTOS = 60;
const LOTE_MAXIMO_SEGURO = 200;

/** Worker de envio. O conteúdo e a habilitação do canal vêm de regra_notificacao/modelo_mensagem. */
@Injectable()
export class EmailServiceSendPending {
  private readonly logger = new Logger(EmailServiceSendPending.name);
  private emExecucao = false;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(ENVIO_EMAIL) private readonly envio: EnvioEmailPort,
    private readonly config: ConfigService,
  ) {}

  // O cron acorda a cada minuto; a frequência efetiva é lida de configuracoes.
  @Cron('* * * * *')
  async aoAgendar(): Promise<void> {
    if (!(await tarefaLigada(this.pool, TAREFA_AUTOMATICA.envioEmail, this.logger))) return;
    await this.cancelarEmailsDesativados();
    const intervalo = await this.numeroConfiguracao(
      'email_intervalo_processamento_minutos',
      INTERVALO_PADRAO_MINUTOS,
      1,
      INTERVALO_MAXIMO_MINUTOS,
    );
    if (new Date().getMinutes() % intervalo !== 0) return;
    await this.executar();
  }

  // ignorarEspera é usado apenas pelo botão de teste do painel (T6).
  async executar(opcoes: { ignorarEspera?: boolean } = {}): Promise<number> {
    if (this.emExecucao) return 0;
    this.emExecucao = true;
    let tratados = 0;
    try {
      await this.cancelarEmailsDesativados();
      if (!this.envio.configurado) return 0;
      const lote = await this.numeroConfiguracao('email_lote_maximo', LOTE_PADRAO, 1, LOTE_MAXIMO_SEGURO);
      while (tratados < lote && (await this.enviarProximo(opcoes.ignorarEspera ?? false))) tratados++;
      if (tratados > 0) this.logger.log(`${tratados} e-mail(s) tratado(s) neste ciclo.`);
    } catch (erro) {
      this.logger.error(`Falha no worker de e-mail: ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      this.emExecucao = false;
    }
    return tratados;
  }

  private async enviarProximo(ignorarEspera: boolean): Promise<boolean> {
    const fila = await this.pool.query<LinhaNotificacao>(
      'SELECT * FROM public.reservar_proxima_notificacao($1::boolean)',
      [ignorarEspera],
    );
    const item = fila.rows[0];
    if (!item) return false;

    let mensagem: MensagemMontada | null;
    try {
      mensagem = await montarMensagemBanco(
        this.pool,
        item.tipo_evento,
        item.dados ?? {},
        this.config.get<string>('PAINEL_URL'),
        item.id_modelo_mensagem,
      );
    } catch (erro) {
      await this.falhar(
        item,
        null,
        new ErroEnvioEmail(erro instanceof Error ? erro.message : String(erro), false),
      );
      return true;
    }

    // Sem regra ativa de e-mail, não enviar: a linha é cancelada (sem apagar o histórico). O aviso no sino não passa
    // por aqui: enfileirar_notificacao grava a linha interna em notificacao, independente do e-mail.
    if (!mensagem) {
      await this.cancelarEmailsDesativados();
      return true;
    }

    try {
      const resultado = await this.envio.enviar({
        para: item.email_destinatario,
        nomePara: typeof item.dados?.nome === 'string' ? item.dados.nome : undefined,
        ...mensagem,
      });
      await this.pool.query(
        'SELECT public.concluir_notificacao($1::int, $2::varchar, $3::varchar, $4::varchar)',
        [item.id_notificacao, mensagem.assunto, this.envio.provedor, resultado.idMensagem],
      );
    } catch (erro) {
      await this.falhar(
        item,
        mensagem.assunto,
        erro instanceof ErroEnvioEmail
          ? erro
          : new ErroEnvioEmail(erro instanceof Error ? erro.message : String(erro), true),
      );
    }
    return true;
  }

  private async falhar(item: LinhaNotificacao, assunto: string | null, erro: ErroEnvioEmail): Promise<void> {
    const decisao = await this.pool.query<{ r: string }>(
      'SELECT public.falhar_notificacao($1::int, $2::varchar, $3::text, $4::boolean, $5::varchar) AS r',
      [item.id_notificacao, assunto, erro.message, erro.recuperavel, this.envio.provedor],
    );
    this.logger.warn(
      `E-mail ${item.id_notificacao} (${item.tipo_evento}) não saiu: ${erro.message}; ficou ${decisao.rows[0]?.r ?? '?'}.`,
    );
  }


  private async cancelarEmailsDesativados(): Promise<void> {
    try {
      const resultado = await this.pool.query<{ quantidade: number }>(
        'SELECT public.cancelar_notificacoes_email_desativado()::int AS quantidade',
      );
      const quantidade = resultado.rows[0]?.quantidade ?? 0;
      if (quantidade > 0) this.logger.log(`${quantidade} e-mail(s) cancelado(s): canal desativado ou sem modelo ativo.`);
    } catch (erro) {
      // Se a migration ainda não foi aplicada, não derruba o serviço; o envio normal falhará de forma visível ao consultar modelos.
      this.logger.warn(`Não foi possível sincronizar regras de e-mail: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  private async numeroConfiguracao(chave: string, padrao: number, minimo: number, maximo: number): Promise<number> {
    try {
      // config_numero é SECURITY DEFINER: lê parâmetros globais mesmo quando o worker não tem sessão HTTP/RLS.
      const resultado = await this.pool.query<{ valor: string | null }>(
        'SELECT public.config_numero($1::text, $2::numeric)::text AS valor',
        [chave, padrao],
      );
      const numero = Number(resultado.rows[0]?.valor);
      if (!Number.isFinite(numero)) return padrao;
      return Math.min(Math.max(Math.trunc(numero), minimo), maximo);
    } catch {
      return padrao;
    }
  }
}