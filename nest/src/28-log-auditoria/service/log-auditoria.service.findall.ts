import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  paginar,
  ResultadoPaginado,
} from '../../commons/database/paginacao.util';
import { LogAuditoriaConverter } from '../dto/converter/log-auditoria.converter';
import { LogAuditoriaRequestList } from '../dto/request/log-auditoria.request-list';
import { LogAuditoriaResponse } from '../dto/response/log-auditoria.response';

// Tamanho de página BEM menor que o teto de segurança (500) usado em
// usuario/configuracao (paginacao.util.ts) - de propósito. Aqui não é um
// teto "pra nunca baixar tudo por acidente", é o tamanho de verdade do
// painel "Ver log" (botão no fundo de cada tabela, GenericTable): mostrar
// as últimas 20 alterações é o caso de uso real, não um catálogo inteiro.
const TAMANHO_PADRAO_LOG = 20;

@Injectable()
export class LogAuditoriaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    query: LogAuditoriaRequestList,
  ): Promise<ResultadoPaginado<LogAuditoriaResponse>> {
    // pol_log_auditoria_select (04_rls_policies.sql [04-L]) já exige
    // tem_permissao('log_visualizar') - sem ela, a query abaixo volta
    // vazia (RLS filtra a nível de linha), não dá erro.
    const consulta = this.database
      .getDb()
      .selectFrom('log_auditoria')
      .leftJoin(
        'usuario',
        'usuario.id_usuario',
        'log_auditoria.id_usuario_responsavel',
      )
      .select([
        'log_auditoria.id_log',
        'log_auditoria.tabela',
        'log_auditoria.identidade_registro',
        'log_auditoria.operacao',
        'log_auditoria.id_usuario_responsavel',
        'usuario.nome as nome_responsavel',
        'log_auditoria.campos_alterados',
        'log_auditoria.dados_anteriores',
        'log_auditoria.dados_novos',
        'log_auditoria.ocorrido_em',
      ])
      .where('log_auditoria.tabela', '=', query.tabela)
      .orderBy('log_auditoria.ocorrido_em', 'desc');

    const resultado = await paginar(consulta, {
      pagina: query.pagina,
      tamanho: query.tamanho ?? TAMANHO_PADRAO_LOG,
    });

    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        LogAuditoriaConverter.paraResponseDto(linha),
      ),
    };
  }
}
