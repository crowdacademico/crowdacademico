import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  CODIGO_PG_UNIQUE_VIOLATION,
  CODIGO_PG_RLS_VIOLATION,
} from '../../commons/database/postgres-exception.filter';
import { TermoUsoRequestCriar } from '../dto/request/termo-uso.request-criar';
import { TermoUsoResponse } from '../dto/response/termo-uso.response';

// Publicar versão nova = 2 writes (desativar a atual DO MESMO TIPO + inserir
// a nova já ativa), na MESMA transação por requisição (GlobalDbInterceptor,
// mesmo padrão de campanha.service.rejeitar.ts - nenhum dos dois precisa de
// `db.transaction()` manual aqui). Precisa ser assim por causa de
// uq_termos_uso_ativo (02_indices.sql): índice único parcial que só admite
// 1 linha ativa POR TIPO (13-09-2026, antes era 1 no sistema inteiro) - se
// o INSERT novo entrasse como ativo SEM desativar a antiga DO MESMO TIPO
// primeiro, o próprio banco rejeitaria (2 linhas ativas do mesmo tipo ao
// mesmo tempo). O UPDATE É FILTRADO POR `tipo` de propósito - publicar uma
// versão nova de 'contribuicao' NUNCA pode desativar o termo ativo de
// 'cadastro' (e vice-versa), são trilhas independentes.
//
// Se a pessoa não tiver 'termos_uso_gerenciar': o UPDATE de desativar (USING
// da RLS) simplesmente não enxerga nenhuma linha e atualiza 0 (não é erro),
// e o INSERT seguinte é quem rejeita de verdade (WITH CHECK da RLS) - a
// transação inteira desfaz o UPDATE também, então uma tentativa sem
// permissão nunca deixa o termo atual desativado por engano.
@Injectable()
export class TermoUsoServiceCriar {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: TermoUsoRequestCriar): Promise<TermoUsoResponse> {
    try {
      await this.database
        .getDb()
        .updateTable('termos_de_uso')
        .set({ ativo: false })
        .where('tipo', '=', dto.tipo)
        .where('ativo', '=', true)
        .execute();

      const linha = await this.database
        .getDb()
        .insertInto('termos_de_uso')
        .values({
          tipo: dto.tipo,
          versao: dto.versao,
          conteudo: dto.conteudo,
          ativo: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        idTermo: linha.id_termo,
        tipo: linha.tipo,
        versao: linha.versao,
        conteudo: linha.conteudo,
        ativo: linha.ativo,
        criadoEm: linha.criado_em,
      };
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo === CODIGO_PG_UNIQUE_VIOLATION) {
        throw new ConflictException(
          `Já existe uma versão de Termos de Uso com o código "${dto.versao}".`,
        );
      }
      if (codigo === CODIGO_PG_RLS_VIOLATION) {
        throw new ForbiddenException(
          "Sem permissão 'termos_uso_gerenciar' para publicar uma nova versão dos Termos de Uso.",
        );
      }
      throw erro;
    }
  }
}
