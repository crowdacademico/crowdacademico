import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { FakeEmailAdapter } from '../../4-mail/adapters/fake/fake-email.adapter';
import { montarMensagem } from '../../4-mail/modelos/montar-mensagem';
import {
  ENVIO_EMAIL,
  type EnvioEmailPort,
} from '../../4-mail/ports/envio-email.port';
import type { StatusNotificacao } from '../../commons/database/db.types';

// Até onde a T6 foi limpa (parâmetro do Campo de Testes, 07): ela lista os e-mails com número acima deste.
export const CHAVE_CAIXA_LIMPA_ATE = 'teste_caixa_email_limpa_ate_id';
const PERMISSAO = 'notificacao_processar';
const MENSAGEM_SEM_PERMISSAO =
  'Só quem cuida dos e-mails do sistema vê a caixa de teste.';

export interface EmailDaCaixa {
  idNotificacao: number;
  para: string;
  tipoEvento: string;
  assunto: string;
  status: StatusNotificacao;
  criadoEm: Date;
  enviadoEm: Date | null;
  provedor: string | null;
}

export interface PreviaDoEmail {
  assunto: string;
  texto: string;
  html: string;
  // true = o que o provedor de teste recebeu, letra por letra; false = montado agora a partir dos dados (na fila, ou
  // enviado antes de o Nest reiniciar).
  exato: boolean;
}

interface LinhaNotificacao {
  id_notificacao: number;
  email_destinatario: string;
  tipo_evento: string;
  assunto: string | null;
  status: StatusNotificacao;
  criado_em: Date;
  enviado_em: Date | null;
  provedor: string | null;
  id_mensagem_provedor: string | null;
  dados: Record<string, unknown>;
}

// Caixa de E-mails do Campo de Testes (T6): TODOS os e-mails do banco (na fila, enviados, que falharam, cancelados)
// desde a última limpeza. Só o "Limpar a caixa" tira alguém da lista; reiniciar o Nest não apaga nada. O conteúdo vem
// da memória do provedor de teste quando ele tem o e-mail, e senão é montado na hora pelos mesmos modelos do envio.
@Injectable()
export class EmailServiceCaixa {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
    private readonly config: ConfigService,
    @Inject(ENVIO_EMAIL) private readonly envio: EnvioEmailPort,
  ) {}

  async listar(): Promise<EmailDaCaixa[]> {
    await this.autorizacao.exigirPermissao(PERMISSAO, MENSAGEM_SEM_PERMISSAO);
    const resultado = await sql<LinhaNotificacao>`
      SELECT * FROM notificacao
      WHERE id_notificacao > public.config_numero(${CHAVE_CAIXA_LIMPA_ATE}, 0)
      ORDER BY id_notificacao DESC
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idNotificacao: linha.id_notificacao,
      para: linha.email_destinatario,
      tipoEvento: linha.tipo_evento,
      assunto:
        linha.assunto ??
        montarMensagem(linha.tipo_evento, linha.dados, this.urlPainel())
          ?.assunto ??
        linha.tipo_evento,
      status: linha.status,
      criadoEm: linha.criado_em,
      enviadoEm: linha.enviado_em,
      provedor: linha.provedor,
    }));
  }

  async previa(idNotificacao: number): Promise<PreviaDoEmail> {
    await this.autorizacao.exigirPermissao(PERMISSAO, MENSAGEM_SEM_PERMISSAO);
    const resultado = await sql<LinhaNotificacao>`
      SELECT * FROM notificacao WHERE id_notificacao = ${idNotificacao}
    `.execute(this.database.getDb());
    const linha = resultado.rows[0] as LinhaNotificacao | undefined;
    if (!linha) throw new NotFoundException('E-mail não encontrado.');

    const recebido =
      this.envio instanceof FakeEmailAdapter && linha.id_mensagem_provedor
        ? this.envio
            .listar()
            .find((m) => m.idMensagem === linha.id_mensagem_provedor)
        : undefined;
    if (recebido) {
      return {
        assunto: recebido.assunto,
        texto: recebido.texto,
        html: recebido.html,
        exato: true,
      };
    }
    const montada = montarMensagem(
      linha.tipo_evento,
      linha.dados,
      this.urlPainel(),
    );
    if (montada) return { ...montada, exato: false };
    const aviso =
      'Este e-mail levava um link com código (confirmar a conta ou criar nova senha). O código é apagado do banco assim que o e-mail sai, e o Nest reiniciou depois do envio: não dá para mostrar o texto de novo.';
    return {
      assunto: linha.assunto ?? linha.tipo_evento,
      texto: aviso,
      html: `<p style="font-family:Arial,sans-serif">${aviso}</p>`,
      exato: false,
    };
  }

  // Esvazia a caixa: grava o maior número de agora no parâmetro e limpa a memória do provedor de teste. Os e-mails
  // continuam no banco (aba Notificações); só saem da T6.
  async limpar(): Promise<void> {
    await this.autorizacao.exigirPermissao(PERMISSAO, MENSAGEM_SEM_PERMISSAO);
    await sql`
      UPDATE configuracoes
      SET valor = (SELECT COALESCE(MAX(id_notificacao), 0) FROM notificacao)::text
      WHERE chave = ${CHAVE_CAIXA_LIMPA_ATE} AND id_usuario IS NULL
    `.execute(this.database.getDb());
    if (this.envio instanceof FakeEmailAdapter) this.envio.limpar();
  }

  private urlPainel(): string | undefined {
    return this.config.get<string>('PAINEL_URL');
  }
}
