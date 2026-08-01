import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { ClsService } from 'nestjs-cls';
import { CLS_KEY_KYSELY_DB } from './database.constants';
import { DB } from './db.types';

// Ponto único que qualquer service usa pra falar com o banco — nenhum service
// precisa saber que existe nestjs-cls, AsyncLocalStorage, Kysely ligado a um
// client específico ou nada disso, só `this.database.getDb()`.
@Injectable()
export class DatabaseService {
  constructor(private readonly cls: ClsService) {}

  getDb(): Kysely<DB> {
    const db = this.cls.get<Kysely<DB>>(CLS_KEY_KYSELY_DB);
    if (!db) {
      // Só acontece se alguém chamar isto fora do pipeline HTTP do Nest (ex.:
      // dentro do próprio GlobalDbInterceptor antes de ele rodar, ou num
      // script solto) — o interceptor é global, toda rota HTTP passa por ele.
      throw new Error(
        'DatabaseService.getDb() chamado fora de uma requisição com ' +
          'GlobalDbInterceptor já executado — nenhum Kysely disponível no contexto.',
      );
    }
    return db;
  }
}
