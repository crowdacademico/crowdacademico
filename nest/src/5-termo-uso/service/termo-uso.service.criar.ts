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

// Publicar versão nova NUNCA ativa sozinha (13-09-2026, corrigido a pedido
// do Lucas: "não é assim que funciona" - fluxo real é criar rascunho, a
// "staff" revisar/procurar erro de português, e SÓ DEPOIS o administrador
// tornar essa versão vigente manualmente, ver TermoUsoServiceAtivar). Antes
// deste ajuste, Criar desativava a versão anterior e ativava a nova na
// mesma transação, automaticamente - virou um INSERT simples, sempre
// `ativo: false`, sem tocar em mais nenhuma linha.
@Injectable()
export class TermoUsoServiceCriar {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: TermoUsoRequestCriar): Promise<TermoUsoResponse> {
    try {
      const linha = await this.database
        .getDb()
        .insertInto('termos_de_uso')
        .values({
          tipo: dto.tipo,
          versao: dto.versao,
          conteudo: dto.conteudo,
          ativo: false,
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
          `Já existe uma versão de Termos de Uso com o código "${dto.versao}" neste tipo.`,
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
