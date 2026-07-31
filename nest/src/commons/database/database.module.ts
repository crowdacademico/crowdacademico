import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';

// Módulo global: qualquer módulo do app pode injetar o Pool com
// @Inject(PG_POOL) sem precisar importar DatabaseModule de novo.
// O Pool conecta como app_nestjs (nunca como postgres/superusuário) —
// é o que faz a RLS do banco valer de verdade (ver tutorial-rodar-projeto.md).
@Global()
@Module({
  imports: [ConfigModule],
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
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
