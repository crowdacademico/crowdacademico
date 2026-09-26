import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../commons/database/database.constants';

// GET /health: qualquer plataforma de deploy (Render, Railway, Fly) precisa disso para saber se a aplicação
// está viva. Sem login, sem RequireAuthGuard: precisa responder mesmo antes de qualquer usuário existir/logar,
// e é isso que a plataforma de deploy chama periodicamente para decidir se reinicia o processo.
//
// `@Inject(PG_POOL)` direto (não `DatabaseService.getDb()`) de propósito: é o MESMO padrão que
// `DatabaseModule.onModuleInit()` usa (`SELECT current_user`) para testar a conexão crua com o Postgres; um
// health check tem que testar a fundação (o Pool consegue abrir uma conexão e rodar uma query?), não passar
// pela maquinaria de transação por requisição do GlobalDbInterceptor (BEGIN/SET app.id_usuario_atual/COMMIT),
// que é sobre RLS/auditoria de quem fez o quê, irrelevante aqui.
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async verificar() {
    try {
      await this.pool.query('SELECT 1');
      return { status: 'ok', banco: 'conectado' };
    } catch {
      // 503 (Service Unavailable), não 500: a aplicação em si está de pé
      // (respondeu a rota), é a DEPENDÊNCIA (banco) que está fora - é essa
      // distinção que a plataforma de deploy usa pra decidir se reinicia o
      // processo (500 num bug de código) ou só espera (503, o banco volta
      // sozinho).
      throw new HttpException(
        { status: 'erro', banco: 'sem conexão' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
