import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../database/database.service';

// Checagem de permissão no Nest, só para leitura cuja tabela é permissiva de propósito na RLS (por exemplo
// `usuario`, que o login precisa achar antes de existir alguém autenticado). Onde a RLS decide sozinha, não use isto.
// Tudo roda com o mesmo contexto de sessão da requisição (id_usuario_atual, tem_permissao).
@Injectable()
export class AutorizacaoService {
  constructor(private readonly database: DatabaseService) {}

  async exigirPermissao(codigo: string, mensagem: string): Promise<void> {
    const resultado = await sql<{
      pode: boolean;
    }>`SELECT public.tem_permissao(${codigo}) AS pode`.execute(
      this.database.getDb(),
    );
    if (!resultado.rows[0]?.pode) {
      throw new ForbiddenException(mensagem);
    }
  }

  // O próprio usuário sempre pode; qualquer outro precisa da permissão.
  async exigirProprioOuPermissao(
    idAlvo: number,
    codigo: string,
    mensagem: string,
  ): Promise<void> {
    const resultado = await sql<{
      eu: number | null;
      pode: boolean;
    }>`SELECT public.id_usuario_atual() AS eu, public.tem_permissao(${codigo}) AS pode`.execute(
      this.database.getDb(),
    );
    const linha = resultado.rows[0];
    if (linha.eu === idAlvo || linha.pode) {
      return;
    }
    throw new ForbiddenException(mensagem);
  }
}
