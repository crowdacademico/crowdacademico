import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
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
    // Achado do Claude Web (03-08-2026): bcrypt é lento DE PROPÓSITO
    // (~100ms por verificação, ver auth.service.login.ts) — sem limite
    // nenhum, é fácil derrubar o servidor só de CPU mandando muitas
    // tentativas de login em paralelo, mesmo com senha errada e sem
    // precisar de conta válida (DoS barato). 5 tentativas por 60s por IP
    // em produção (aplicado só em POST /auth/login, ver
    // `@UseGuards(ThrottlerGuard)` em auth.controller.login.ts) —
    // generoso o bastante pra alguém errando a senha de verdade, apertado
    // o bastante pra travar um script tentando muitas senhas seguidas.
    // Isto é ALÉM do `limite_tentativas_login` do banco
    // (03_funcoes_seguranca.sql), que já bloqueia POR CONTA depois de N
    // falhas — o throttler aqui protege o SERVIDOR (CPU/rede), não uma
    // conta específica; um ataque espalhado por várias contas diferentes
    // não aciona o bloqueio do banco, mas aciona este.
    //
    // Limite maior fora de produção (achado 07-08-2026): o próprio
    // <dev> "Entrar como" (dev-login-rapido.jsx) dispara um POST
    // /auth/login por clique, e tem 7 contas no dropdown — testar 6+
    // delas em menos de 1 minuto (uso normal do botão) já esbarrava nos
    // 5/60s e travava, em silêncio, TODOS os logins (o limite é por IP,
    // não por conta) pelo resto da janela. 5/60s continua valendo em
    // produção (NODE_ENV=production); em dev fica 30/60s, folgado o
    // bastante pra passear pelo dropdown inteiro sem esbarrar.
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: process.env.NODE_ENV === 'production' ? 5 : 30 },
    ]),
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
