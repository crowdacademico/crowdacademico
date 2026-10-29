import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { renderizarVariaveis } from '../../4-mail/modelos/renderizar-template-db';

export interface NotificacaoInternaItem {
  id_notificacao_interna: number;
  tipo_evento: string;
  titulo: string;
  mensagem: string;
  dados: Record<string, unknown>;
  url_destino: string | null;
  criado_em: Date | string;
  lida_em: Date | string | null;
}

interface LinhaNotificacaoInterna {
  id_notificacao_interna: number;
  tipo_evento: string;
  dados: Record<string, unknown>;
  url_destino: string | null;
  criado_em: Date | string;
  lida_em: Date | string | null;
  titulo_template: string;
  corpo_texto_template: string;
}

/**
 * O sino da plataforma. A tabela guarda o id do modelo (uma versão imutável de modelo_mensagem) e os dados do evento,
 * não o texto: título e mensagem são montados aqui, na leitura, com as mesmas variáveis do e-mail. Assim o conteúdo
 * vem sempre do modelo que o admin configurou, e um aviso antigo continua mostrando o texto da versão da época.
 */
@Injectable()
export class NotificacaoInternaService {
  constructor(private readonly database: DatabaseService) {}

  async listar(
    limite = 20,
    somenteNaoLidas = false,
  ): Promise<NotificacaoInternaItem[]> {
    const db = this.database.getDb();
    const resultado = await sql<LinhaNotificacaoInterna>`
      SELECT n.id_notificacao AS id_notificacao_interna, n.tipo_evento, n.dados, n.url_destino, n.criado_em, n.lida_em,
             m.titulo_template, m.corpo_texto_template
      FROM public.notificacao n
      JOIN public.modelo_mensagem m ON m.id_modelo_mensagem = n.id_modelo_mensagem
      WHERE n.canal = 'interna'
        AND n.id_usuario = public.id_usuario_atual()
        AND (${somenteNaoLidas}::boolean = FALSE OR n.lida_em IS NULL)
      ORDER BY n.criado_em DESC, n.id_notificacao DESC
      LIMIT ${Math.min(Math.max(Math.trunc(limite || 20), 1), 100)}
    `.execute(db);
    return resultado.rows.map((linha) => this.montar(linha));
  }

  private montar(linha: LinhaNotificacaoInterna): NotificacaoInternaItem {
    const dados = linha.dados;
    // Modelo que ficou vazio depois de trocar as variáveis não derruba a lista: cai num texto genérico.
    const titulo =
      renderizarVariaveis(linha.titulo_template, dados)
        .replace(/[\r\n]+/g, ' ')
        .trim() || 'Notificação';
    const mensagem =
      renderizarVariaveis(linha.corpo_texto_template, dados).trim() || titulo;
    return {
      id_notificacao_interna: linha.id_notificacao_interna,
      tipo_evento: linha.tipo_evento,
      titulo,
      mensagem,
      dados,
      url_destino: linha.url_destino,
      criado_em: linha.criado_em,
      lida_em: linha.lida_em,
    };
  }

  async resumo(): Promise<{ total_nao_lidas: number }> {
    const resultado = await sql<{ total_nao_lidas: number }>`
      SELECT COUNT(*)::int AS total_nao_lidas
      FROM public.notificacao
      WHERE canal = 'interna'
        AND id_usuario = public.id_usuario_atual()
        AND lida_em IS NULL
    `.execute(this.database.getDb());
    return { total_nao_lidas: resultado.rows[0]?.total_nao_lidas ?? 0 };
  }

  async marcarComoLida(id: number): Promise<{ atualizada: boolean }> {
    const resultado = await sql<{ id_notificacao_interna: number }>`
      UPDATE public.notificacao
      SET lida_em = COALESCE(lida_em, NOW())
      WHERE id_notificacao = ${id}
        AND canal = 'interna'
        AND id_usuario = public.id_usuario_atual()
      RETURNING id_notificacao AS id_notificacao_interna
    `.execute(this.database.getDb());
    return { atualizada: resultado.rows.length > 0 };
  }

  async marcarTodasComoLidas(): Promise<{ quantidade: number }> {
    const resultado = await sql<{ id_notificacao_interna: number }>`
      UPDATE public.notificacao
      SET lida_em = NOW()
      WHERE canal = 'interna'
        AND id_usuario = public.id_usuario_atual()
        AND lida_em IS NULL
      RETURNING id_notificacao AS id_notificacao_interna
    `.execute(this.database.getDb());
    return { quantidade: resultado.rows.length };
  }
}