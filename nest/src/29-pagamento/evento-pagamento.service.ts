import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../commons/database/database.constants';
import { EventoPagamentoDto } from './dto/evento-pagamento.dto';

export interface ResultadoRegistroEvento {
  idEvento: number;
  // TRUE = este provedor já tinha entregue este id de evento antes.
  duplicado: boolean;
  // TRUE = aquele evento JÁ foi tratado (processado_em preenchido). Duplicado + processado: o webhook responde 200 e
  // não faz mais nada. Duplicado + NÃO processado: o gateway está reentregando algo que não resolvemos da primeira
  // vez; a reentrega é a nossa nova tentativa e o evento é processado agora.
  processado: boolean;
  // TRUE = o sistema deliberadamente NÃO aplicou aquele evento e ele espera decisão humana (revisao_manual_em
  // preenchido). Reentrega de evento em revisão: o webhook responde 200 e não reprocessa (nada mudaria).
  emRevisao: boolean;
}

// Status que um webhook pode pedir. Os demais (repassado, a_devolver, devolvido...) nascem de rotinas nossas, nunca de
// um evento do gateway.
export type StatusAplicavelPorEvento =
  'confirmado' | 'expirado' | 'reembolsado';

// Resultados de aplicar_evento_pagamento() (05, [05-K-2]); o significado de cada um está no cabeçalho da função.
// Resultado de aplicar_evento_repasse (05): a gêmea de ResultadoAplicacaoEvento para o webhook de REPASSE.
export type ResultadoAplicacaoEventoRepasse =
  | 'aplicado'
  | 'sem_mudanca'
  | 'sem_acao'
  | 'ja_processado'
  | 'ja_em_revisao'
  | 'repasse_nao_encontrado'
  | 'revisao_manual'
  | 'evento_inexistente';

// Status que um evento de repasse pode aplicar (o estado REAL da transferência, consultado no provedor).
export type StatusRepasseAplicavelPorEvento = 'concluido' | 'erro';

// Evento da caixa que NÃO terminou com sucesso (processado_em NULL), sem o payload. `situacao` separa o que precisa de
// gente do que é só tentar de novo (ver listar_eventos_nao_processados em 05).
export interface EventoNaoProcessado {
  idEvento: number;
  provedor: string;
  idEventoExterno: string;
  tipoEvento: string;
  recebidoEm: Date;
  motivo: string | null;
  revisaoManualEm: Date | null;
  situacao: 'vale_tentar_de_novo' | 'em_revisao_manual';
}

export type ResultadoAplicacaoEvento =
  | 'aplicado'
  | 'sem_mudanca'
  | 'sem_acao'
  | 'ja_processado'
  | 'ja_em_revisao'
  | 'contribuicao_nao_encontrada'
  | 'revisao_manual'
  | 'evento_inexistente';

// Acesso do módulo de pagamento à caixa de entrada de webhooks (evento_pagamento). Só chama funções SECURITY DEFINER
// (05, [05-K-2]); nenhum INSERT/UPDATE direto, porque app_nestjs só tem SELECT na tabela (06, [06-H]).
//
// `PG_POOL` direto, NUNCA `DatabaseService.getDb()`: webhook chega sem usuário logado, então não há sessão nem
// app.id_usuario_atual para o GlobalDbInterceptor montar (e a rota é @SemTransacaoGlobal(), ver o controller). Não é
// problema: as funções são SECURITY DEFINER e SEM autorização de propósito (mesma categoria de registrar_falha_login).
// A barreira é o WebhookVerifierPort, que o service do webhook chama ANTES de qualquer método daqui.
@Injectable()
export class EventoPagamentoService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async registrar(
    evento: EventoPagamentoDto,
  ): Promise<ResultadoRegistroEvento> {
    // O driver `pg` serializa objeto como JSON, mas serializa ARRAY como array do Postgres: um payload que seja
    // array quebraria. Por isso sempre string + cast ::jsonb.
    const resultado = await this.pool.query<{
      id_evento: number;
      duplicado: boolean;
      processado: boolean;
      em_revisao: boolean;
    }>(
      'SELECT * FROM public.registrar_evento_pagamento($1, $2, $3, $4::jsonb)',
      [
        evento.provedor,
        evento.idEventoExterno,
        evento.tipoEventoOriginal,
        JSON.stringify(evento.payload),
      ],
    );

    const linha = resultado.rows[0];
    return {
      idEvento: linha.id_evento,
      duplicado: linha.duplicado,
      processado: linha.processado,
      emRevisao: linha.em_revisao,
    };
  }

  // Aplica o evento de forma atômica no banco (acha a contribuição, faz a transição, marca o evento processado).
  // `novoStatus` null = evento que não pede ação (só é marcado como processado).
  async aplicar(
    idEvento: number,
    provedor: string,
    idCobranca: string | null,
    novoStatus: StatusAplicavelPorEvento | null,
    valorEvento?: number,
  ): Promise<ResultadoAplicacaoEvento> {
    const resultado = await this.pool.query<{
      resultado: ResultadoAplicacaoEvento;
    }>(
      `SELECT public.aplicar_evento_pagamento($1::int, $2::varchar, $3::varchar, $4::status_contribuicao, $5::numeric) AS resultado`,
      [idEvento, provedor, idCobranca, novoStatus, valorEvento ?? null],
    );
    return resultado.rows[0].resultado;
  }

  // Webhook de repasse: aplica no banco o estado real da transferência (concluida => contribuições 'repassado'; falha =>
  // repasse 'erro'). `novoStatus` null = evento que não pede ação.
  async aplicarRepasse(
    idEvento: number,
    provedor: string,
    idTransferencia: string | null,
    novoStatus: StatusRepasseAplicavelPorEvento | null,
    motivo?: string,
  ): Promise<ResultadoAplicacaoEventoRepasse> {
    const resultado = await this.pool.query<{
      resultado: ResultadoAplicacaoEventoRepasse;
    }>(
      `SELECT public.aplicar_evento_repasse($1::int, $2::varchar, $3::text, $4::status_repasse, $5::text) AS resultado`,
      [idEvento, provedor, idTransferencia, novoStatus, motivo ?? null],
    );
    return resultado.rows[0].resultado;
  }

  // Leitura para o job de reconciliação e para um reprocessamento futuro. A tabela tem RLS por permissão e o job não tem
  // sessão: a leitura passa por função SECURITY DEFINER própria. Quem expuser isto numa ROTA deve checar a permissão
  // evento_pagamento_visualizar antes.
  async listarNaoProcessados(limite = 100): Promise<EventoNaoProcessado[]> {
    const resultado = await this.pool.query<{
      id_evento_pagamento: number;
      provedor: string;
      id_evento_externo: string;
      tipo_evento: string;
      recebido_em: Date;
      erro_processamento: string | null;
      revisao_manual_em: Date | null;
      situacao: EventoNaoProcessado['situacao'];
    }>('SELECT * FROM public.listar_eventos_nao_processados($1::int)', [
      limite,
    ]);
    return resultado.rows.map((linha) => ({
      idEvento: linha.id_evento_pagamento,
      provedor: linha.provedor,
      idEventoExterno: linha.id_evento_externo,
      tipoEvento: linha.tipo_evento,
      recebidoEm: linha.recebido_em,
      motivo: linha.erro_processamento,
      revisaoManualEm: linha.revisao_manual_em,
      situacao: linha.situacao,
    }));
  }

  // Registra por que o evento não pôde ser tratado AGORA, sem marcá-lo processado (continua na fila de reentrega).
  async registrarFalha(idEvento: number, motivo: string): Promise<void> {
    await this.pool.query(
      'SELECT public.registrar_falha_evento_pagamento($1::int, $2::text)',
      [idEvento, motivo],
    );
  }
}
