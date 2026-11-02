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

// Tela Notificações: todo aviso que o sistema mandou, por e-mail e pelo sino, de todas as contas. A permissão é checada
// aqui, e não só pela RLS: pol_notificacao_select deixa cada conta ler os próprios avisos, e esta lista é a do
// painel. O título do aviso do sino e o conteúdo de cada aviso saem do modelo do canal dele, como o sino e o envio
// montam. Mais novo primeiro; paginada de verdade (a tabela cresce a cada evento).
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
      .selectFrom('notificacao as n')
      .leftJoin('usuario as u', 'u.id_usuario', 'n.id_usuario')
      .leftJoin('modelo_mensagem as m', (juncao) =>
        juncao
          .onRef('m.tipo_evento', '=', 'n.tipo_evento')
          .onRef('m.canal', '=', 'n.canal'),
      )
      .selectAll('n')
      .select([
        'u.nome as nome_usuario',
        'm.titulo as titulo_modelo',
        'm.corpo as corpo_modelo',
      ])
      .orderBy('n.criado_em', 'desc')
      .orderBy('n.id_notificacao', 'desc');

    if (query.canal) {
      consulta = consulta.where('n.canal', '=', query.canal);
    }
    if (query.status) {
      consulta = consulta.where('n.status', '=', query.status);
    }
    const busca = query.busca?.trim();
    if (busca) {
      const padrao = `%${busca.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
      consulta = consulta.where((eb) =>
        eb.or([
          eb('n.email_destinatario', 'ilike', padrao),
          eb('u.nome', 'ilike', padrao),
          eb('n.tipo_evento', 'ilike', padrao),
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
        NotificacaoConverter.paraResponseDto(linha, {
          nomeUsuario: linha.nome_usuario,
          tituloModelo: linha.titulo_modelo,
          corpoModelo: linha.corpo_modelo,
        }),
      ),
    };
  }
}
