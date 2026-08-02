import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

const CODIGO_PG_UNIQUE_VIOLATION = '23505';
const CODIGO_PG_FOREIGN_KEY_VIOLATION = '23503';
const CODIGO_PG_NOT_NULL_VIOLATION = '23502';
const CODIGO_PG_CHECK_VIOLATION = '23514';
const CODIGO_PG_RLS_VIOLATION = '42501';
// Código padrão que o Postgres usa pra qualquer `RAISE EXCEPTION 'mensagem'`
// sem ERRCODE customizado (05_regras_negocio.sql tem ~40 desses ainda sem
// ERRCODE — pendência declarada da Alexia, não deste filtro).
const CODIGO_PG_RAISE_EXCEPTION_SEM_ERRCODE = 'P0001';

interface ErroPostgres extends Error {
  code?: string;
}

// Rede de segurança GLOBAL pra erro de Postgres que nenhum service tratou
// localmente (achado do Claude da Alexia, 02-08-2026: usuario.service.create
// não tinha try/catch nenhum em volta do INSERT — e-mail duplicado virava
// 500 cru em vez de 409). Services que já têm try/catch próprio (ex.:
// configuracao.service.create.ts, usuario-papel.service.create.ts) nunca
// chegam aqui pra esses casos — a mensagem específica deles é melhor que a
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

  private traduzir(erro: ErroPostgres): HttpException | null {
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
        // de negócio, etc — 400 com a mensagem original da função (definida
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
