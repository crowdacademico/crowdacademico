import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../commons/database/database.module';
import { UsuarioModule } from '../1-usuario/usuario.module';
import { PapelPermissaoModule } from '../2-papel-permissao/papel-permissao.module';
import { AuthModule } from '../3-auth/auth.module';
import { ConfiguracoesModule } from '../11-configuracoes/configuracoes.module';
import { LogAuditoriaModule } from '../28-log-auditoria/log-auditoria.module';
import { DashboardModule } from '../29-dashboard/dashboard.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsuarioModule,
    PapelPermissaoModule,
    AuthModule,
    ConfiguracoesModule,
    LogAuditoriaModule,
    DashboardModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
