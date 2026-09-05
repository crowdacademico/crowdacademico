import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../commons/database/database.module';
import { LoggingModule } from '../commons/logging/logging.module';
import { RequestLoggerMiddleware } from '../commons/logging/request-logger.middleware';
import { UsuarioModule } from '../1-usuario/usuario.module';
import { TermoUsoModule } from '../5-termo-uso/termo-uso.module';
import { PapelPermissaoModule } from '../2-papel-permissao/papel-permissao.module';
import { AuthModule } from '../3-auth/auth.module';
import { ConfiguracoesModule } from '../11-configuracoes/configuracoes.module';
import { AreaConhecimentoModule } from '../8-area-conhecimento/area-conhecimento.module';
import { LogAuditoriaModule } from '../27-log-auditoria/log-auditoria.module';
import { DashboardModule } from '../28-dashboard/dashboard.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { TipoLinkModule } from '../9-tipo-link/tipo-link.module';
import { MotivoDenunciaModule } from '../10-motivo-denuncia/motivo-denuncia.module';
import { PerfilPesquisadorModule } from '../6-perfil-pesquisador/perfil-pesquisador.module';
import { LinkAcademicoModule } from '../7-link-academico/link-academico.module';
import { CampanhaModule } from '../12-campanha/campanha.module';
import { OrcamentoCampanhaModule } from '../13-orcamento-campanha/orcamento-campanha.module';
import { MarcoCronogramaModule } from '../14-marco-cronograma/marco-cronograma.module';
import { AtualizacaoCampanhaModule } from '../15-atualizacao-campanha/atualizacao-campanha.module';
import { SeguirCampanhaModule } from '../16-seguir-campanha/seguir-campanha.module';
import { ComentarioModule } from '../17-comentario/comentario.module';
import { ArquivoModule } from '../25-arquivo/arquivo.module';
import { StorageModule } from '../commons/storage/storage.module';
import { ConfiguracaoValorModule } from '../commons/configuracao/configuracao-valor.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Habilita @Cron em qualquer service do app (05-09-2026, RF-057) - sem
    // isso registrado uma vez aqui, o decorator @Cron não faz nada sozinho,
    // precisa do agendador do próprio módulo rodando por trás. Primeiro
    // consumidor: CampanhaServiceEncerrarVencidas (12-campanha).
    ScheduleModule.forRoot(),
    DatabaseModule,
    // Log de requisição com id (05-09-2026, item 6 da lista de pendências) -
    // ver configure() logo abaixo, é lá que o middleware é aplicado de
    // verdade a toda rota.
    LoggingModule,
    // Global (ver commons/storage/storage.module.ts) - registrado aqui,
    // junto de DatabaseModule, por ser infra compartilhada por qualquer
    // módulo, não só 25-arquivo.
    StorageModule,
    // Global também (04-09-2026) - leitura de configuracoes por qualquer
    // módulo que precisar de um número configurável pelo Painel Admin,
    // sem precisar de trigger de banco por trás. Primeiro consumidor:
    // 25-arquivo (limites de upload).
    ConfiguracaoValorModule,
    UsuarioModule,
    TermoUsoModule,
    PapelPermissaoModule,
    AuthModule,
    ConfiguracoesModule,
    AreaConhecimentoModule,
    TipoLinkModule,
    MotivoDenunciaModule,
    PerfilPesquisadorModule,
    LinkAcademicoModule,
    CampanhaModule,
    OrcamentoCampanhaModule,
    MarcoCronogramaModule,
    AtualizacaoCampanhaModule,
    SeguirCampanhaModule,
    ComentarioModule,
    ArquivoModule,
    LogAuditoriaModule,
    DashboardModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  // Middleware, não interceptor (ver comentário completo em
  // request-logger.middleware.ts) - precisa do evento nativo `res.on
  // ('finish')` do Express pra pegar o status HTTP já definitivo.
  // `forRoutes('*')` cobre toda rota, incluindo as que não passam por
  // nenhum guard/interceptor específico (ex.: `GET /health`).
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
