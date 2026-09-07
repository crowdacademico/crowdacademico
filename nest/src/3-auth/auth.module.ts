import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { UsuarioModule } from '../1-usuario/usuario.module';
import { TermoUsoModule } from '../5-termo-uso/termo-uso.module';
import { AuthControllerCadastro } from './controllers/auth.controller.cadastro';
import { AuthControllerLogin } from './controllers/auth.controller.login';
import { AuthControllerLogout } from './controllers/auth.controller.logout';
import { AuthControllerRefresh } from './controllers/auth.controller.refresh';
import { AuthControllerSessoes } from './controllers/auth.controller.sessoes';
import { AuthControllerVerificarEmail } from './controllers/auth.controller.verificar-email';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthServiceCadastro } from './service/auth.service.cadastro';
import { AuthServiceEncerrarSessao } from './service/auth.service.encerrar-sessao';
import { AuthServiceListarSessoes } from './service/auth.service.listar-sessoes';
import { AuthServiceLogin } from './service/auth.service.login';
import { AuthServiceLogout } from './service/auth.service.logout';
import { AuthServiceRefresh } from './service/auth.service.refresh';
import { AuthServiceVerificarEmail } from './service/auth.service.verificar-email';

@Module({
  imports: [
    UsuarioModule,
    TermoUsoModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          // Cast: @nestjs/jwt tipa expiresIn com o StringValue "carimbado"
          // do pacote `ms` (ex.: "15m"), não com `string` genérico - o valor
          // vem do .env como string comum, o formato é validado em runtime
          // pela própria lib `ms`, não em tempo de compilação.
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
            '15m') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [
    AuthControllerLogin,
    AuthControllerRefresh,
    AuthControllerLogout,
    AuthControllerCadastro,
    AuthControllerVerificarEmail,
    AuthControllerSessoes,
  ],
  providers: [
    AuthServiceLogin,
    AuthServiceRefresh,
    AuthServiceLogout,
    AuthServiceCadastro,
    AuthServiceVerificarEmail,
    AuthServiceListarSessoes,
    AuthServiceEncerrarSessao,
    // Global de verdade (roda em toda rota) - ver comentário em
    // guards/jwt-auth.guard.ts sobre por que fica ANTES do GlobalDbInterceptor
    // no pipeline do Nest.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
