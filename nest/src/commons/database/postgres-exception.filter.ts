import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

// Exportadas (13-09-2026, achado de auditoria: 10 arquivos de `*.service.
// create.ts`/`*.service.remove.ts`/`*.service.update.ts` redeclaravam a
// mesma cadeia literal localmente, em vez de importar daqui - o lugar
// central já existia desde sempre, só ninguém importava dele) - qualquer
// service que trata um código específico no próprio `catch` (em vez de
// deixar cair nesta rede de segurança global) deve importar daqui, nunca
// redeclarar o literal.
export const CODIGO_PG_UNIQUE_VIOLATION = '23505';
export const CODIGO_PG_FOREIGN_KEY_VIOLATION = '23503';
export const CODIGO_PG_NOT_NULL_VIOLATION = '23502';
export const CODIGO_PG_CHECK_VIOLATION = '23514';
export const CODIGO_PG_RLS_VIOLATION = '42501';
// Código padrão que o Postgres usa pra qualquer `RAISE EXCEPTION 'mensagem'`
// sem ERRCODE customizado. Só sobra pra função de fora de 05_regras_negocio.sql
// que ainda não ganhou ERRCODE próprio (ex.: excluir_conta_usuario(), em
// 03_funcoes_seguranca.sql - ver DOCUMENTACAO_ERRCODE.md, seção final).
export const CODIGO_PG_RAISE_EXCEPTION_SEM_ERRCODE = 'P0001';

// ERRCODE customizado nas 42 RAISE EXCEPTION de 05_regras_negocio.sql
// (Alexia + uma IA, 03-08-2026 - ver DOCUMENTACAO_ERRCODE.md pra tabela
// completa código -> função -> mensagem, e DOCUMENTACAO_BD.md, seção "05",
// pro resumo oficial). 4 faixas, pelo prefixo de 2 dígitos do código:
// 90xxx validação de dado/negócio, 91xxx conflito de estado, 92xxx
// autorização negada (regra de negócio, não RLS), 93xxx limite de taxa.
const FAIXA_ERRCODE_REGRA_NEGOCIO: Record<string, HttpStatus> = {
  '90': HttpStatus.BAD_REQUEST,
  '91': HttpStatus.CONFLICT,
  '92': HttpStatus.FORBIDDEN,
  '93': HttpStatus.TOO_MANY_REQUESTS,
};

interface ErroPostgres extends Error {
  code?: string;
}

// Rede de segurança GLOBAL pra erro de Postgres que nenhum service tratou
// localmente (achado numa auditoria de IA feita pela Alexia, 02-08-2026: usuario.service.create
// não tinha try/catch nenhum em volta do INSERT - e-mail duplicado virava
// 500 cru em vez de 409). Services que já têm try/catch próprio (ex.:
// configuracao.service.create.ts, usuario-papel.service.create.ts) nunca
// chegam aqui pra esses casos - a mensagem específica deles é melhor que a
// genérica daqui, então continuam como estão. Isto é só a rede embaixo.
@Catch()
export class PostgresExceptionFilter extends BaseExceptionFilter {
  catch(excecao: unknown, host: ArgumentsHost): void {
    if (excecao instanceof HttpException) {
      super.catch(excecao, host);
      return;
    }

    const traduzido = this.traduzir(excecao as ErroPostgres);
    super.catch(traduzido ?? excecao, host);
  }

  // `erro: ErroPostgres` chega aqui via `excecao as ErroPostgres` no
  // `catch()` acima, a partir de um `excecao: unknown` que é literalmente
  // QUALQUER coisa lançada em QUALQUER lugar da aplicação (`@Catch()` sem
  // filtro de tipo) - `as` é cast, não prova; `erro?.code` fica de
  // propósito, mesmo o tipo declarado dizendo que `erro` nunca é nulo.
  private traduzir(erro: ErroPostgres): HttpException | null {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const prefixoNegocio = erro?.code?.slice(0, 2);
    if (prefixoNegocio && prefixoNegocio in FAIXA_ERRCODE_REGRA_NEGOCIO) {
      return new HttpException(
        erro.message || 'Operação não permitida pelas regras de negócio.',
        FAIXA_ERRCODE_REGRA_NEGOCIO[prefixoNegocio],
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    switch (erro?.code) {
      case CODIGO_PG_UNIQUE_VIOLATION:
        return new HttpException(
          'Já existe um registro com estes dados.',
          HttpStatus.CONFLICT,
        );
      case CODIGO_PG_FOREIGN_KEY_VIOLATION:
        return new HttpException(
          'Referência inválida: o registro relacionado não existe.',
          HttpStatus.BAD_REQUEST,
        );
      case CODIGO_PG_NOT_NULL_VIOLATION:
        return new HttpException(
          'Campo obrigatório ausente.',
          HttpStatus.BAD_REQUEST,
        );
      case CODIGO_PG_CHECK_VIOLATION:
        return new HttpException(
          'Dado inválido para este campo.',
          HttpStatus.BAD_REQUEST,
        );
      case CODIGO_PG_RLS_VIOLATION:
        return new HttpException(
          'Sem permissão para esta operação.',
          HttpStatus.FORBIDDEN,
        );
      case CODIGO_PG_RAISE_EXCEPTION_SEM_ERRCODE:
        // Sem ERRCODE customizado não dá pra saber SE é permissão, validação
        // de negócio, etc - 400 com a mensagem original da função (definida
        // em 05_regras_negocio.sql) é o mais honesto que dá pra ser aqui.
        return new HttpException(
          erro.message || 'Operação não permitida pelas regras de negócio.',
          HttpStatus.BAD_REQUEST,
        );
      default:
        return null;
    }
  }
}
