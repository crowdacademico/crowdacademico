import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { DUPLICIDADE_POR_INDICE_UNICO } from './mensagens-duplicidade.constants';
import { REGRA_POR_CONSTRAINT } from './mensagens-regra-violada.constants';

// Códigos exportados: qualquer service que trata um código específico no próprio `catch` (em vez de deixar cair
// nesta rede de segurança global) deve importar daqui, nunca redeclarar o literal.
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

// ERRCODE customizado nas RAISE EXCEPTION de 05_regras_negocio.sql (ver DOCUMENTACAO_ERRCODE.md para a tabela
// completa código -> função -> mensagem, e DOCUMENTACAO_BD.md, seção "05", para o resumo oficial). 4 faixas,
// pelo prefixo de 2 dígitos do código: 90xxx validação de dado/negócio, 91xxx conflito de estado, 92xxx
// autorização negada (regra de negócio, não RLS), 93xxx limite de taxa.
const FAIXA_ERRCODE_REGRA_NEGOCIO: Record<string, HttpStatus> = {
  '90': HttpStatus.BAD_REQUEST,
  '91': HttpStatus.CONFLICT,
  '92': HttpStatus.FORBIDDEN,
  '93': HttpStatus.TOO_MANY_REQUESTS,
};

interface ErroPostgres extends Error {
  code?: string;
  detail?: string;
  // Nome da constraint/índice violado (23505, 23514...): escolhe a mensagem de duplicidade ou da regra violada.
  constraint?: string;
  // Coluna que ficou vazia (23502): vira o campo do formulário.
  column?: string;
}

// Coluna do banco (snake_case) para o campo do formulário (camelCase, como nos DTOs).
const paraCampo = (coluna: string): string =>
  coluna.replace(/_([a-z])/g, (_, letra: string) => letra.toUpperCase());

// Tradução GLOBAL de erro de Postgres para HTTP (ex.: e-mail duplicado num INSERT sem try/catch viraria 500 cru
// em vez de 409). Duplicidade (23505) é tratada SÓ aqui, com mensagem e campo por índice
// (mensagens-duplicidade.constants.ts): services não repetem esse `catch`. O que continua no service é o que
// só ele sabe dizer (ex.: 42501 com o nome da permissão que faltou para aquela operação).
@Catch()
export class PostgresExceptionFilter extends BaseExceptionFilter {
  catch(excecao: unknown, host: ArgumentsHost): void {
    if (excecao instanceof HttpException) {
      super.catch(this.traduzirPipe(excecao), host);
      return;
    }

    const traduzido = this.traduzir(excecao as ErroPostgres);
    super.catch(traduzido ?? excecao, host);
  }

  // Os pipes de parâmetro do Nest (ParseIntPipe, ParseEnumPipe...) respondem em inglês ("Validation failed (numeric
  // string is expected)"), inclusive quando falta um filtro obrigatório na URL (ex.: ?idCampanha=).
  private traduzirPipe(excecao: HttpException): HttpException {
    const corpo = excecao.getResponse();
    const mensagem =
      typeof corpo === 'string'
        ? corpo
        : (corpo as { message?: unknown }).message;
    // Rota que não existe: o Nest responde "Cannot DELETE /x".
    const rota =
      typeof mensagem === 'string'
        ? /^Cannot (\w+) (\S+)$/.exec(mensagem)
        : null;
    if (rota) {
      return new NotFoundException(
        `Rota não encontrada: ${rota[1]} ${rota[2]}.`,
      );
    }
    const tipo =
      typeof mensagem === 'string'
        ? /^Validation failed \((\w+) string is expected\)$/.exec(mensagem)?.[1]
        : undefined;
    if (!tipo) {
      return excecao;
    }
    const esperado: Record<string, string> = {
      numeric: 'um número',
      enum: 'um dos valores aceitos',
      boolean: 'verdadeiro ou falso',
      uuid: 'um identificador válido',
    };
    return new HttpException(
      {
        statusCode: excecao.getStatus(),
        error: 'Bad Request',
        message: `Parâmetro da requisição ausente ou inválido: era esperado ${esperado[tipo] ?? 'outro formato'}.`,
      },
      excecao.getStatus(),
    );
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
      return this.montar(
        erro,
        erro.message || 'Operação não permitida pelas regras de negócio.',
        FAIXA_ERRCODE_REGRA_NEGOCIO[prefixoNegocio],
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    switch (erro?.code) {
      case CODIGO_PG_UNIQUE_VIOLATION: {
        const conhecida = erro.constraint
          ? DUPLICIDADE_POR_INDICE_UNICO[erro.constraint]
          : undefined;
        const mensagem =
          conhecida?.mensagem ?? 'Já existe um registro com estes dados.';
        return this.montar(
          erro,
          mensagem,
          HttpStatus.CONFLICT,
          conhecida?.campo ? { [conhecida.campo]: [mensagem] } : undefined,
        );
      }
      case CODIGO_PG_FOREIGN_KEY_VIOLATION:
        // Na prática: algo escolhido numa lista foi excluído por outra pessoa enquanto a tela estava aberta.
        return this.montar(
          erro,
          'Um dos itens escolhidos não existe mais (pode ter sido excluído). Recarregue a página e tente de novo.',
          HttpStatus.BAD_REQUEST,
        );
      case CODIGO_PG_NOT_NULL_VIOLATION: {
        const campo = erro.column ? paraCampo(erro.column) : undefined;
        return this.montar(
          erro,
          'Falta preencher um campo obrigatório.',
          HttpStatus.BAD_REQUEST,
          campo ? { [campo]: ['Este campo é obrigatório.'] } : undefined,
        );
      }
      case CODIGO_PG_CHECK_VIOLATION: {
        const conhecida = erro.constraint
          ? REGRA_POR_CONSTRAINT[erro.constraint]
          : undefined;
        const mensagem =
          conhecida?.mensagem ??
          'Um dos valores informados está fora do permitido. Confira os campos e tente de novo.';
        return this.montar(
          erro,
          mensagem,
          HttpStatus.BAD_REQUEST,
          conhecida?.campo ? { [conhecida.campo]: [mensagem] } : undefined,
        );
      }
      case CODIGO_PG_RLS_VIOLATION:
        return this.montar(
          erro,
          'Sem permissão para esta operação.',
          HttpStatus.FORBIDDEN,
        );
      case CODIGO_PG_RAISE_EXCEPTION_SEM_ERRCODE:
        // Sem ERRCODE customizado não dá pra saber SE é permissão, validação
        // de negócio, etc - 400 com a mensagem original da função (definida
        // em 05_regras_negocio.sql) é o mais honesto que dá pra ser aqui.
        return this.montar(
          erro,
          erro.message || 'Operação não permitida pelas regras de negócio.',
          HttpStatus.BAD_REQUEST,
        );
      default:
        return null;
    }
  }

  // Corpo de erro da API (ver DOCUMENTACAO_ERRCODE.md, "Contrato do corpo de erro"): `statusCode` e `message`,
  // mais `codigo` (o SQLSTATE: 9xxxx de regra de negócio, ou 23505/23503/23502/23514/42501/P0001 dos nativos)
  // para o front distinguir a regra pelo código estável em vez do texto da mensagem. `dados` é opcional: só
  // aparece se o RAISE mandou um DETAIL em JSON (nenhum manda ainda, o gancho está pronto). O nome da
  // constraint violada NÃO vai no corpo, é detalhe interno. `campos` (opcional, mesmo formato do erro de
  // validação do ValidationPipe, ver commons/validacao): { <campo do formulário>: [mensagens] }, para a tela
  // mostrar o erro embaixo do campo certo.
  private montar(
    erro: ErroPostgres,
    mensagem: string,
    status: HttpStatus,
    campos?: Record<string, string[]>,
  ): HttpException {
    const corpo: Record<string, unknown> = {
      statusCode: status,
      codigo: erro.code,
      message: mensagem,
      ...(campos ? { campos } : {}),
    };
    const dados = this.lerDetalheJson(erro.detail);
    if (dados) {
      corpo.dados = dados;
    }
    return new HttpException(corpo, status);
  }

  private lerDetalheJson(detalhe: string | undefined): object | null {
    if (!detalhe) {
      return null;
    }
    try {
      const lido: unknown = JSON.parse(detalhe);
      return typeof lido === 'object' && lido !== null ? lido : null;
    } catch {
      return null;
    }
  }
}
