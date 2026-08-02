import { Global, Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';
import { DatabaseService } from './database.service';
import { GlobalDbInterceptor } from './global-db.interceptor';
import { PostgresExceptionFilter } from './postgres-exception.filter';

// Módulo global: qualquer módulo do app pode injetar o Pool com
// @Inject(PG_POOL), ou (preferível, ver DatabaseService) usar
// DatabaseService.getDb() pra pegar o Kysely já vinculado à transação da
// requisição atual. O Pool conecta como app_nestjs (nunca como postgres/
// superusuário) — é o que faz a RLS do banco valer de verdade (ver
// tutorial-rodar-projeto.md).
@Global()
@Module({
  imports: [
    ConfigModule,
    // mount:true monta o middleware do CLS (só abre o contexto de
    // AsyncLocalStorage por requisição, não decide nada de negócio) em toda
    // rota automaticamente — sem isso, o `cls.set()` do GlobalDbInterceptor
    // não teria contexto nenhum pra escrever.
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
  ],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Pool({
          connectionString: config.get<string>('DATABASE_URL'),
        });
      },
    },
    DatabaseService,
    // Registrado aqui (não no AppModule) pra manter tudo que é "conexão com
    // banco" num lugar só. Nest reconhece APP_INTERCEPTOR como token global
    // independente de qual módulo o declara.
    { provide: APP_INTERCEPTOR, useClass: GlobalDbInterceptor },
    // Mesma lógica: erro de Postgres é "conexão com banco", fica junto.
    { provide: APP_FILTER, useClass: PostgresExceptionFilter },
  ],
  exports: [PG_POOL, DatabaseService],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // tutorial-rodar-projeto.md, item 2: conectar como qualquer outro usuário
  // que não seja app_nestjs (ex.: postgres, por engano no .env) faz a RLS
  // deixar de valer SILENCIOSAMENTE — nada quebra na hora, só some a proteção.
  // Falha rápido e alto na subida em vez de deixar isso passar despercebido.
  async onModuleInit(): Promise<void> {
    const resultado = await this.pool.query<{ current_user: string }>(
      'SELECT current_user',
    );
    const usuarioConectado = resultado.rows[0]?.current_user;
    if (usuarioConectado !== 'app_nestjs') {
      throw new Error(
        `Backend conectou como "${usuarioConectado}", não como "app_nestjs" ` +
          '— a Row Level Security do banco fica sem efeito nenhum pra esse ' +
          'usuário (RLS não se aplica a superusuário/dono de tabela). ' +
          'Confira DATABASE_URL no .env (tutorial-rodar-projeto.md, Parte 4).',
      );
    }
    this.logger.log('Conectado ao Postgres como app_nestjs — RLS ativa.');
  }
}
