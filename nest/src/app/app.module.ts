import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
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
    // CORRIGIDO (07-09-2026, achado incidentalmente ao revisar o trabalho da
    // migração TS, depois confirmado ao vivo): existiam DOIS
    // `ThrottlerModule.forRoot()` (auth.module.ts e usuario.module.ts) - o
    // módulo é `@Global()` (conferido direto em
    // node_modules/@nestjs/throttler), e `THROTTLER_OPTIONS` é um token de
    // string FIXO, o mesmo em toda chamada de `forRoot()` - o segundo
    // registro vencia o primeiro no processo inteiro. Confirmado ao vivo:
    // POST /auth/login (que não declarava `@Throttle()` próprio, só confiava
    // no default do módulo) ficou limitado a 1 tentativa POR HORA (o valor
    // pensado só pra GET /usuario/eu/exportar-dados), não 5-30/60s como
    // deveria - login inteiro inutilizável, silenciosamente. Só não afetou a
    // exportação porque ela já declarava `@Throttle()` próprio no controller
    // (sobrescreve o default do módulo, não importa o que ele diga).
    //
    // Regra do projeto daqui pra frente: toda rota com limite de frequência
    // declara o PRÓPRIO `@Throttle()` no controller - o default aqui embaixo
    // é só rede de segurança genérica, nunca a fonte do valor de uma rota
    // sensível. Este valor (60/min) não protege login nem exportação -
    // ambos têm o limite deles decorado no próprio controller.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
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
