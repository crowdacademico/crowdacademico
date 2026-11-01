import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { LIMITE_AVISOS_SINO } from '../constants/notificacao.constants';
import {
  NotificacaoInternaResponse,
  NotificacaoInternaResumo,
} from '../dto/response/notificacao-interna.response';
import { montarParagrafos, montarTexto } from '../util/montar-texto-modelo';

interface LinhaAviso {
  id_notificacao: number;
  tipo_evento: string;
  dados: Record<string, unknown>;
  criado_em: Date;
  lida_em: Date | null;
  titulo: string | null;
  corpo: string | null;
}

// O sino do painel: os avisos da própria conta, do mais novo ao mais antigo. O texto é montado aqui, do modelo do
// sino de cada tipo; um tipo sem modelo aparece com o nome do tipo, sem quebrar a lista.
@Injectable()
export class NotificacaoInternaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<NotificacaoInternaResponse[]> {
    const resultado = await sql<LinhaAviso>`
      SELECT n.id_notificacao, n.tipo_evento, n.dados, n.criado_em, n.lida_em, m.titulo, m.corpo
      FROM notificacao n
      LEFT JOIN modelo_mensagem m ON m.tipo_evento = n.tipo_evento AND m.canal = 'interna'
      WHERE n.canal = 'interna' AND n.id_usuario = public.id_usuario_atual()
      ORDER BY n.criado_em DESC, n.id_notificacao DESC
      LIMIT ${LIMITE_AVISOS_SINO}
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idNotificacao: linha.id_notificacao,
      tipoEvento: linha.tipo_evento,
      titulo: montarTexto(linha.titulo ?? linha.tipo_evento, linha.dados)
        .replace(/\s+/g, ' ')
        .trim(),
      mensagem: montarParagrafos(linha.corpo ?? '', linha.dados).join(' '),
      criadoEm: linha.criado_em,
      lidaEm: linha.lida_em,
    }));
  }

  async naoLidas(): Promise<NotificacaoInternaResumo> {
    const resultado = await sql<{ n: number }>`
      SELECT count(*)::int AS n FROM notificacao
      WHERE canal = 'interna' AND id_usuario = public.id_usuario_atual() AND lida_em IS NULL
    `.execute(this.database.getDb());
    return { naoLidas: resultado.rows[0]?.n ?? 0 };
  }
}
