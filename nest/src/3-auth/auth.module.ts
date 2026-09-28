import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { UsuarioModule } from '../1-usuario/usuario.module';
import { TermoUsoModule } from '../5-termo-uso/termo-uso.module';
import { AuthControllerRegister } from './controllers/auth.controller.register';
import { AuthControllerLogin } from './controllers/auth.controller.login';
import { AuthControllerLogout } from './controllers/auth.controller.logout';
import { AuthControllerRefresh } from './controllers/auth.controller.refresh';
import { AuthControllerFindAllSessions } from './controllers/auth.controller.findall-sessions';
import { AuthControllerVerifyEmail } from './controllers/auth.controller.verify-email';
import { AuthGuardJwt } from './guards/auth.guard.jwt';
import { AuthGuardRequireAuth } from './guards/auth.guard.require-auth';
import { AuthServiceRegister } from './service/auth.service.register';
import { AuthServiceEndSession } from './service/auth.service.end-session';
import { AuthServiceFindAllSessions } from './service/auth.service.findall-sessions';
import { AuthServiceLogin } from './service/auth.service.login';
import { AuthServiceLogout } from './service/auth.service.logout';
import { AuthServiceRefresh } from './service/auth.service.refresh';
import { AuthServiceVerifyEmail } from './service/auth.service.verify-email';

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
    AuthControllerRegister,
    AuthControllerVerifyEmail,
    AuthControllerFindAllSessions,
  ],
  providers: [
    AuthServiceLogin,
    AuthServiceRefresh,
    AuthServiceLogout,
    AuthServiceRegister,
    AuthServiceVerifyEmail,
    AuthServiceFindAllSessions,
    AuthServiceEndSession,
    // Global de verdade (roda em toda rota) - ver comentário em
    // guards/auth.guard.jwt.ts sobre por que fica ANTES do GlobalDbInterceptor
    // no pipeline do Nest.
    { provide: APP_GUARD, useClass: AuthGuardJwt },
    // Depois da AuthGuardJwt (que resolve quem é): toda rota exige login, menos as marcadas com @Publico().
    { provide: APP_GUARD, useClass: AuthGuardRequireAuth },
  ],
})
export class AuthModule {}
