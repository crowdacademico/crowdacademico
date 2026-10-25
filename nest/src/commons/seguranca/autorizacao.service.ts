import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../database/database.service';

// Uma permissão, ou uma lista em que qualquer uma basta.
export type CodigoPermissao = string | readonly string[];

// Checagem de permissão no Nest, só para leitura cuja tabela é permissiva de propósito na RLS (por exemplo
// `usuario`, que o login precisa achar antes de existir alguém autenticado). Onde a RLS decide sozinha, não use isto.
// Tudo roda com o mesmo contexto de sessão da requisição (id_usuario_atual, tem_permissao).
@Injectable()
export class AutorizacaoService {
  constructor(private readonly database: DatabaseService) {}

  async exigirPermissao(
    codigo: CodigoPermissao,
    mensagem: string,
  ): Promise<void> {
    const resultado = await sql<{
      pode: boolean;
    }>`SELECT COALESCE(bool_or(public.tem_permissao(c)), FALSE) AS pode FROM unnest(${lista(codigo)}::text[]) AS c`.execute(
      this.database.getDb(),
    );
    if (!resultado.rows[0]?.pode) {
      throw new ForbiddenException(mensagem);
    }
  }

  // O próprio usuário sempre pode; qualquer outro precisa da permissão.
  async exigirProprioOuPermissao(
    idAlvo: number,
    codigo: CodigoPermissao,
    mensagem: string,
  ): Promise<void> {
    const resultado = await sql<{
      eu: number | null;
      pode: boolean;
    }>`SELECT public.id_usuario_atual() AS eu,
              (SELECT COALESCE(bool_or(public.tem_permissao(c)), FALSE) FROM unnest(${lista(codigo)}::text[]) AS c) AS pode`.execute(
      this.database.getDb(),
    );
    const linha = resultado.rows[0];
    if (linha.eu === idAlvo || linha.pode) {
      return;
    }
    throw new ForbiddenException(mensagem);
  }
}

function lista(codigo: CodigoPermissao): string[] {
  return typeof codigo === 'string' ? [codigo] : [...codigo];
}
