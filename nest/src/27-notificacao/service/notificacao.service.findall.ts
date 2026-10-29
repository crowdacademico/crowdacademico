import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  paginar,
  ResultadoPaginado,
} from '../../commons/database/paginacao.util';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import {
  MENSAGEM_SEM_PERMISSAO_NOTIFICACAO,
  PERMISSAO_NOTIFICACAO,
  TAMANHO_PAGINA_NOTIFICACAO,
} from '../constants/notificacao.constants';
import { NotificacaoConverter } from '../dto/converter/notificacao.converter';
import { NotificacaoRequestList } from '../dto/request/notificacao.request-list';
import { NotificacaoResponse } from '../dto/response/notificacao.response';

// A permissão é checada aqui, e não só pela RLS: pol_notificacao_select deixa cada conta ler os próprios e-mails, e
// esta lista é a do painel, de todos. Mais novo primeiro; paginada de verdade (a tabela cresce a cada evento).
@Injectable()
export class NotificacaoServiceFindAll {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async executar(
    query: NotificacaoRequestList,
  ): Promise<ResultadoPaginado<NotificacaoResponse>> {
    await this.autorizacao.exigirPermissao(
      PERMISSAO_NOTIFICACAO,
      MENSAGEM_SEM_PERMISSAO_NOTIFICACAO,
    );

    let consulta = this.database
      .getDb()
      .selectFrom('notificacao')
      .selectAll()
      .where('canal', '=', 'email')
      .orderBy('criado_em', 'desc')
      .orderBy('id_notificacao', 'desc');

    if (query.status) {
      consulta = consulta.where('status', '=', query.status);
    }
    const busca = query.busca?.trim();
    if (busca) {
      const padrao = `%${busca.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
      consulta = consulta.where((eb) =>
        eb.or([
          eb('email_destinatario', 'ilike', padrao),
          eb('tipo_evento', 'ilike', padrao),
        ]),
      );
    }

    const resultado = await paginar(consulta, {
      pagina: query.pagina,
      tamanho: query.tamanho ?? TAMANHO_PAGINA_NOTIFICACAO,
    });
    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        NotificacaoConverter.paraResponseDto(linha),
      ),
    };
  }
}
