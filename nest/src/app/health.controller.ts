import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../commons/database/database.constants';
import { Publico } from '../commons/auth/publico.decorator';
import { SemTransacaoGlobal } from '../commons/database/sem-transacao-global.decorator';

// GET /health: qualquer plataforma de deploy (Render, Railway, Fly) precisa disso para saber se a aplicação
// está viva. Sem login (@Publico()): precisa responder mesmo antes de qualquer usuário existir/logar,
// e é isso que a plataforma de deploy chama periodicamente para decidir se reinicia o processo.
//
// `@Inject(PG_POOL)` direto (não `DatabaseService.getDb()`) de propósito: é o MESMO padrão que
// `DatabaseModule.onModuleInit()` usa (`SELECT current_user`) para testar a conexão crua com o Postgres; um
// health check tem que testar a fundação (o Pool consegue abrir uma conexão e rodar uma query?), não passar
// pela maquinaria de transação por requisição do GlobalDbInterceptor (BEGIN/SET app.id_usuario_atual/COMMIT),
// que é sobre RLS/auditoria de quem fez o quê, irrelevante aqui.
//
// `@SemTransacaoGlobal()` (03-10-2026) torna isso verdade de fato: antes, o interceptor ainda pegava um client e
// abria BEGIN em volta do handler, e o `pool.query()` abaixo pegava um SEGUNDO client - duas conexões por checagem,
// com a plataforma de deploy chamando a rota a cada poucos segundos. Agora usa uma só, e só a do próprio SELECT 1.
@Controller('health')
@SemTransacaoGlobal()
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  @Publico()
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
