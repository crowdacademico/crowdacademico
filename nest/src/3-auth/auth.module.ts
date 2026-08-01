import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { UsuarioModule } from '../1-usuario/usuario.module';
import { AuthControllerLogin } from './controllers/auth.controller.login';
import { AuthControllerLogout } from './controllers/auth.controller.logout';
import { AuthControllerRefresh } from './controllers/auth.controller.refresh';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthServiceLogin } from './service/auth.service.login';
import { AuthServiceLogout } from './service/auth.service.logout';
import { AuthServiceRefresh } from './service/auth.service.refresh';

@Module({
  imports: [
    UsuarioModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          // Cast: @nestjs/jwt tipa expiresIn com o StringValue "carimbado"
          // do pacote `ms` (ex.: "15m"), não com `string` genérico — o valor
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
  ],
  providers: [
    AuthServiceLogin,
    AuthServiceRefresh,
    AuthServiceLogout,
    // Global de verdade (roda em toda rota) — ver comentário em
    // guards/jwt-auth.guard.ts sobre por que fica ANTES do GlobalDbInterceptor
    // no pipeline do Nest.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
