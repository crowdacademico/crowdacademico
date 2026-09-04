import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Kysely } from 'kysely';
import { ClsService } from 'nestjs-cls';
import { Pool } from 'pg';
import { lastValueFrom, Observable, of } from 'rxjs';
import '../auth/usuario-autenticado.interface';
import {
  CLS_KEY_KYSELY_DB,
  PG_POOL,
  PG_SESSION_VAR_ID_USUARIO_ATUAL,
} from './database.constants';
import { DB } from './db.types';
import { KyselySingleConnectionDialect } from './kysely-single-connection.dialect';

// GlobalDbInterceptor - o núcleo da correção da Pendência 5 (ver
// "Probleminha-chan.md" e PENDENCIAS e correcoes.md). Roda em TODA requisição
// (registrado como APP_INTERCEPTOR global no AppModule), autenticada ou não:
//
// 1. Tira UM client dedicado do Pool (não pool.query() solto).
// 2. Abre uma transação (BEGIN).
// 3. Seta app.id_usuario_atual nessa transação via set_config() parametrizado
//    (nunca SET LOCAL com string interpolada) - id do usuário já resolvido
//    pelo JwtAuthGuard (3-auth), que roda ANTES deste interceptor no
//    pipeline do Nest (guards → interceptors → handler). Rota sem login
//    (request.user indefinido) seta '' - id_usuario_atual() vira NULL,
//    igual anônimo de verdade, sem pular o interceptor.
// 4. Cria um Kysely vinculado a ESTE client específico (KyselySingleConnectionDialect)
//    e guarda no contexto do nestjs-cls - é isso que DatabaseService.getDb()
//    devolve pra qualquer service, em qualquer módulo, sem cada um precisar
//    saber que AsyncLocalStorage existe.
// 5. Ao final: COMMIT se a rota terminou bem, ROLLBACK se lançou qualquer
//    erro - e client.release() sempre, nos dois casos (senão o pool esgota
//    silenciosamente depois de um tempo, não na hora).
@Injectable()
export class GlobalDbInterceptor implements NestInterceptor {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly cls: ClsService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const idUsuario = request.user?.idUsuario ?? null;
      await client.query('SELECT set_config($1, $2, true)', [
        PG_SESSION_VAR_ID_USUARIO_ATUAL,
        idUsuario !== null ? String(idUsuario) : '',
      ]);

      const db = new Kysely<DB>({
        dialect: new KyselySingleConnectionDialect(client),
      });
      this.cls.set(CLS_KEY_KYSELY_DB, db);

      const resultado: unknown = await lastValueFrom(
        next.handle() as Observable<unknown>,
        { defaultValue: undefined },
      );
      await client.query('COMMIT');
      return of(resultado);
    } catch (erro) {
      await client.query('ROLLBACK').catch(() => {
        // Se o ROLLBACK falhar (ex.: conexão já caiu), não deixa esconder o
        // erro original - ele é o que importa pra quem chamou.
      });
      throw erro;
    } finally {
      client.release();
    }
  }
}
